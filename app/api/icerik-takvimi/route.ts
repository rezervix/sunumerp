import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"
import {
  PLATFORMS, CONTENT_TYPES, CONTENT_STATUSES,
  ensureRolesExist, notifyContentAction
} from "./utils"

// ─── GET: İçerik listesi ──────────────────────────────────────────────
// Query params: branchId (tek), branchIds (çoklu, virgülle), from, to, status, platform, contentType, assignedTo
export async function GET(req: Request) {
  const auth = await requirePermission("icerik-takvimi", "read")
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)

  // Çoklu branch desteği — "all" veya branchId listesi
  const branchId = searchParams.get("branchId")
  const branchIds = searchParams.get("branchIds") // virgülle ayrılmış
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const status = searchParams.get("status")
  const platform = searchParams.get("platform")
  const contentType = searchParams.get("contentType")
  const assignedTo = searchParams.get("assignedTo")
  const search = searchParams.get("search")
  const includeShoot = searchParams.get("includeShoot") === "true"

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

      const { generateMockCalendarData } = await import("@/app/dashboard/icerik-takvimi/utils/mockCalendarData")
      const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      const toDate = to ? new Date(to) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      
      let mockData = generateMockCalendarData(fromDate, toDate, branchId, accessibleBranches)

      if (status && status !== "all") {
        mockData = mockData.filter(item => item.status === status)
      }
      if (contentType && contentType !== "all") {
        mockData = mockData.filter(item => item.contentType === contentType)
      }
      if (platform && platform !== "all") {
        mockData = mockData.filter(item => item.platforms.includes(platform))
      }
      if (search) {
        const searchLower = search.toLowerCase()
        mockData = mockData.filter(item => 
          item.title.toLowerCase().includes(searchLower) || 
          (item.caption && item.caption.toLowerCase().includes(searchLower))
        )
      }

      return NextResponse.json(mockData)
    } catch (err) {
      console.error("Mock Data generation failed, falling back to database:", err)
    }
  }

  try {
    // Kullanıcının erişebildiği şubeler
    const userBranches = await prisma.userBranchRole.findMany({
      where: { userId: auth.payload.userId },
      select: { branchId: true },
    })
    const accessibleBranchIds = userBranches.map((b) => b.branchId)

    // Şube filtresi oluştur
    let branchFilter: { in: string[] } | undefined
    if (branchId && branchId !== "all") {
      // Tek şube: erişim kontrolü
      if (!accessibleBranchIds.includes(branchId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      branchFilter = { in: [branchId] }
    } else if (branchIds) {
      const ids = branchIds.split(",").filter((id) => accessibleBranchIds.includes(id))
      branchFilter = { in: ids }
    } else {
      // Tümü (ajans geneli görünüm)
      branchFilter = { in: accessibleBranchIds }
    }

    // Tarih filtresi
    const dateFilter: Record<string, Date> = {}
    if (from) dateFilter.gte = new Date(from)
    if (to) dateFilter.lte = new Date(to)

    const where: Record<string, unknown> = {
      branchId: branchFilter,
    }
    if (Object.keys(dateFilter).length > 0) where.scheduledDate = dateFilter
    if (status && status !== "all") where.status = status
    if (contentType && contentType !== "all") where.contentType = contentType
    if (assignedTo) {
      where.OR = [
        { shooterId: assignedTo },
        { editorId: assignedTo },
        { managerId: assignedTo },
        { designerId: assignedTo },
      ]
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { caption: { contains: search, mode: "insensitive" } },
      ]
    }
    // Platform filtresi (JSON string içinde arama)
    if (platform && platform !== "all") {
      where.platforms = { contains: platform }
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
        where.OR = [
          { shooterId: auth.payload.userId },
          { shoot: { videographerIds: { contains: auth.payload.userId } } }
        ]
      } else if (isEditor && !isShooter) {
        where.editorId = auth.payload.userId
      } else if (isShooter && isEditor) {
        where.OR = [
          { shooterId: auth.payload.userId },
          { editorId: auth.payload.userId },
          { shoot: { videographerIds: { contains: auth.payload.userId } } }
        ]
      }
    }

    const items = await prisma.contentItem.findMany({
      where,
      orderBy: { scheduledDate: "asc" },
      include: {
        media: {
          where: { isFinal: true },
          orderBy: { version: "desc" },
          take: 1,
          select: { id: true, fileUrl: true, fileType: true, thumbnailUrl: true },
        },
        shoot: {
          select: {
            id: true,
            shootDate: true,
            shootTime: true,
            location: true,
            status: true,
          },
        },
        branch: {
          select: { id: true, name: true, themeColor: true, logoUrl: true },
        },
        _count: {
          select: { media: true, chatLinks: true },
        },
      },
    })

    // Platform JSON'ı parse et
    const parsed = items.map((item) => ({
      ...item,
      platforms: safeParseJson(item.platforms, []),
    }))

    return NextResponse.json(parsed)
  } catch (error) {
    console.error("ContentItem GET error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}

// ─── POST: Yeni içerik kaydı ──────────────────────────────────────────
export async function POST(req: Request) {
  const auth = await requirePermission("icerik-takvimi", "create")
  if (auth instanceof NextResponse) return auth

  try {
    // Önce gerekli rollerin varlığını doğrula/oluştur
    await ensureRolesExist()

    const body = await req.json()
    const {
      branchId,
      title,
      caption,
      description,
      platforms,
      contentType,
      scheduledDate,
      scheduledTime,
      status = "taslak",
      shooterId,
      editorId,
      managerId,
      designerId,
      shootId,
      clientApprovalRequired = false,
    } = body

    if (!branchId || !title || !scheduledDate) {
      return NextResponse.json(
        { error: "branchId, title ve scheduledDate zorunlu" },
        { status: 400 }
      )
    }

    if (!contentType) {
      return NextResponse.json({ error: "contentType zorunlu" }, { status: 400 })
    }

    const item = await prisma.contentItem.create({
      data: {
        branchId,
        title,
        caption: caption || null,
        description: description || null,
        platforms: JSON.stringify(Array.isArray(platforms) ? platforms : []),
        contentType,
        scheduledDate: new Date(scheduledDate),
        scheduledTime: scheduledTime || null,
        status,
        shooterId: shooterId || null,
        editorId: editorId || null,
        managerId: managerId || null,
        designerId: designerId || null,
        shootId: shootId || null,
        clientApprovalRequired,
        createdById: auth.payload.userId,
      },
      include: {
        branch: { select: { id: true, name: true, themeColor: true } },
      },
    })

    // İlk StatusHistory kaydı
    await prisma.contentStatusHistory.create({
      data: {
        entityType: "content_item",
        entityId: item.id,
        oldStatus: "",
        newStatus: status,
        changedById: auth.payload.userId,
        note: "İçerik oluşturuldu",
      },
    })

    // Bildirim Kurallarını Çalıştır
    const producers = [shooterId, editorId, designerId].filter(Boolean) as string[]
    const dateStr = new Date(scheduledDate).toLocaleDateString("tr-TR")
    const contentLabels: Record<string, string> = {
      reels: "Reels Videosu",
      motion: "Motion Video",
      akis: "Akış Gönderisi",
      story: "Story Tasarımı",
    }
    const label = contentLabels[contentType] || contentType
    
    await notifyContentAction({
      branchId,
      branchName: item.branch.name,
      contentTitle: title,
      contentType,
      scheduledDate: new Date(scheduledDate),
      actionType: "CREATE",
      customMessage: `${item.branch.name} firması için ${dateStr} tarihine ${label} planlandı`,
      producerIds: producers
    })

    return NextResponse.json({ ...item, platforms: safeParseJson(item.platforms, []) }, { status: 201 })
  } catch (error) {
    console.error("ContentItem POST error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}

// ─── Yardımcı ─────────────────────────────────────────────────────────
function safeParseJson(str: string | null | undefined, fallback: unknown = null) {
  if (!str) return fallback
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

// (İçerikler utils.ts dosyasına taşındı)
