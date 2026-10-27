import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

// GET /api/eod - Query EOD reports (history)
export async function GET(req: Request) {
  const auth = await requirePermission("dashboard", "read")
  if (auth instanceof NextResponse) {
    return auth
  }
  const currentUserId = auth.payload.userId

  // Check if current user is manager
  const user = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { position: true, fullName: true },
  })
  const userPosition = (user?.position || "").trim().toLowerCase()
  const isManager = userPosition === "yönetici" || userPosition === "koordinatör" || auth.payload.roleName === "admin"

  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get("userId")
  const dateStr = searchParams.get("date")

  try {
    const whereClause: any = {}

    // Filter by user: employees can only see their own. Managers can see anyone's or filter by userId
    if (!isManager) {
      whereClause.userId = currentUserId
    } else if (targetUserId) {
      whereClause.userId = targetUserId
    }

    // Filter by date
    if (dateStr) {
      const startOfDay = new Date(dateStr)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(dateStr)
      endOfDay.setHours(23, 59, 59, 999)
      whereClause.reportDate = { gte: startOfDay, lte: endOfDay }
    }

    const reports = await prisma.eodReport.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true, position: true } },
        auditLogs: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { reportDate: "desc" },
    })

    const formattedReports = reports.map((rep) => ({
      ...rep,
      autoContent: JSON.parse(rep.autoContent),
    }))

    return NextResponse.json({ data: formattedReports, isManager })
  } catch (error) {
    console.error("Error fetching EOD reports:", error)
    return NextResponse.json({ error: "Gün sonu raporları yüklenirken hata meydana geldi." }, { status: 500 })
  }
}

// POST /api/eod - Submit EOD report (final approval)
export async function POST(req: Request) {
  const auth = await requirePermission("dashboard", "read")
  if (auth instanceof NextResponse) {
    return auth
  }
  const userId = auth.payload.userId

  try {
    const body = await req.json()
    const { autoContent, manualContent, reportId } = body

    if (!autoContent || !reportId) {
      return NextResponse.json({ error: "autoContent ve reportId alanları zorunludur." }, { status: 400 })
    }

    // Fetch report to verify ownership
    const report = await prisma.eodReport.findUnique({
      where: { id: reportId },
      include: { user: { select: { id: true, fullName: true } } },
    })

    if (!report) {
      return NextResponse.json({ error: "Rapor bulunamadı." }, { status: 404 })
    }

    if (report.userId !== userId) {
      return NextResponse.json({ error: "Bu rapor üzerinde işlem yapmaya yetkiniz yok." }, { status: 403 })
    }

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    // Calculate changes/diff for audit log
    const prevAutoContent = JSON.parse(report.autoContent)
    const diff = {
      prev: prevAutoContent,
      next: autoContent,
    }

    // Update EOD report to submitted status
    const updatedReport = await prisma.eodReport.update({
      where: { id: reportId },
      data: {
        status: "submitted",
        autoContent: JSON.stringify(autoContent),
        manualContent: manualContent || "",
        submittedAt: new Date(),
      },
    })

    // Log the submission in audit logs
    await prisma.eodReportAuditLog.create({
      data: {
        reportId,
        userId,
        action: "submit",
        details: JSON.stringify(diff),
      },
    })

    // Query managers to notify
    const managers = await prisma.user.findMany({
      where: {
        OR: [
          { position: { contains: "yönetici", mode: "insensitive" } },
          { position: { contains: "koordinatör", mode: "insensitive" } },
          { position: { contains: "admin", mode: "insensitive" } },
          { department: { contains: "yönetim", mode: "insensitive" } },
        ],
      },
      select: { id: true },
    })

    // Notify all managers
    for (const manager of managers) {
      if (manager.id === userId) continue // Skip self notification if manager is submitting
      await prisma.notification.create({
        data: {
          userId: manager.id,
          title: "Gün Sonu Raporu Tamamlandı 🎉",
          message: `${report.user.fullName} o güne ait Gün Sonu Raporunu onaylayıp gönderdi.`,
          type: "success",
          moduleType: "reports",
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updatedReport,
        autoContent,
      },
    })
  } catch (error) {
    console.error("Error submitting EOD report:", error)
    return NextResponse.json({ error: "Gün sonu raporu gönderilirken hata oluştu." }, { status: 500 })
  }
}
