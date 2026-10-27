import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload, isSuperAdminUser } from "@/lib/auth/server-permission"
import { createNotification } from "@/lib/services/notificationService"
import { mkdir, writeFile } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"

// Rate limiting: In-memory cache for rate-limiting requests (max 3 tickets per 1 minute per user)
const rateLimitMap = new Map<string, number[]>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(userId) || []
  const recent = timestamps.filter(t => now - t < 60 * 1000)
  recent.push(now)
  rateLimitMap.set(userId, recent)
  return recent.length <= 3
}

// Helper to escape HTML and prevent XSS
function escapeHtml(text: string): string {
  if (!text) return ""
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

// 20MB file size limit for normal uploads, but user request states max 5MB for screenshot/ticket files
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"]

// POST /api/support-tickets - Create a new support ticket
export async function POST(req: Request) {
  const auth = await getAuthPayload()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Rate Limiting check
  if (!checkRateLimit(auth.userId)) {
    return NextResponse.json(
      { error: "Dakikada en fazla 3 destek talebi oluşturabilirsiniz. Lütfen biraz bekleyin." },
      { status: 429 }
    )
  }

  try {
    const formData = await req.formData()
    const description = formData.get("description") as string
    const category = (formData.get("category") as string) || "other"
    const priority = (formData.get("priority") as string) || "medium"
    const pageUrl = (formData.get("pageUrl") as string) || ""
    const moduleName = (formData.get("moduleName") as string) || ""
    const appVersion = (formData.get("appVersion") as string) || "1.0.0"

    // Parse JSON fields
    let browserInfo = {}
    let consoleLogs = []
    let networkLogs = []
    try {
      browserInfo = JSON.parse((formData.get("browserInfo") as string) || "{}")
      consoleLogs = JSON.parse((formData.get("consoleLogs") as string) || "[]")
      networkLogs = JSON.parse((formData.get("networkLogs") as string) || "[]")
    } catch (e) {
      // JSON parse error - proceed with defaults
    }

    // Mask sensitive fields in network logs
    const sensitiveKeys = ["token", "password", "auth", "key", "secret", "passwordReset", "cookie"]
    const maskLogs = (logs: any[]) => {
      return logs.map(log => {
        const masked = { ...log }
        if (masked.responseBody) {
          // Attempt parsing response body and mask
          try {
            const bodyObj = typeof masked.responseBody === "string" ? JSON.parse(masked.responseBody) : masked.responseBody
            const maskObj = (obj: any) => {
              if (!obj || typeof obj !== "object") return
              for (const k of Object.keys(obj)) {
                if (sensitiveKeys.some(sk => k.toLowerCase().includes(sk))) {
                  obj[k] = "[MASKED]"
                } else if (typeof obj[k] === "object") {
                  maskObj(obj[k])
                }
              }
            }
            maskObj(bodyObj)
            masked.responseBody = JSON.stringify(bodyObj)
          } catch (e) {
            masked.responseBody = "[JSON content or binary payload]"
          }
        }
        return masked
      })
    }

    const cleanedNetworkLogs = maskLogs(networkLogs)

    // Form validations
    if (!description || description.trim() === "") {
      return NextResponse.json({ error: "Açıklama alanı zorunludur." }, { status: 400 })
    }

    // Escape text content for XSS protection
    const escapedDescription = escapeHtml(description)
    let title = formData.get("title") as string
    if (!title || title.trim() === "") {
      title = `[${moduleName || "ERP Modülü"}] sayfasında hata`
    }
    const escapedTitle = escapeHtml(title)

    // Save screenshots & attachments
    const uploadDir = join(process.cwd(), "public", "uploads", "support")
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (err) {}

    let screenshotUrl: string | null = null
    const screenshotFile = formData.get("screenshot") as File | null

    if (screenshotFile) {
      if (screenshotFile.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "Ekran görüntüsü 5MB limitini aşamaz." }, { status: 400 })
      }
      if (!ALLOWED_MIME_TYPES.includes(screenshotFile.type)) {
        return NextResponse.json({ error: "Ekran görüntüsü sadece PNG, JPEG veya WEBP formatında olmalıdır." }, { status: 400 })
      }

      const fileExtension = screenshotFile.name.split(".").pop()?.toLowerCase() || "png"
      const fileName = `${uuidv4()}.${fileExtension}`
      const path = join(uploadDir, fileName)
      const buffer = Buffer.from(await screenshotFile.arrayBuffer())
      await writeFile(path, buffer)
      screenshotUrl = `/api/uploads/${fileName}?subdir=support`
    }

    // Create the ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        title: escapedTitle,
        description: escapedDescription,
        category,
        priority,
        pageUrl,
        moduleName,
        browserInfo: browserInfo as any,
        consoleLogs: consoleLogs as any,
        networkLogs: cleanedNetworkLogs as any,
        appVersion,
        reporterUserId: auth.userId,
        screenshotUrl,
        status: "open",
        internalComments: [] as any
      }
    })

    // Handle multiple attachments if provided
    const attachments = formData.getAll("files") as File[]
    if (attachments && attachments.length > 0) {
      for (const file of attachments) {
        if (file.size > MAX_FILE_SIZE) continue // skip oversized files silently or log
        const fileExtension = file.name.split(".").pop()?.toLowerCase() || ""
        const fileName = `${uuidv4()}.${fileExtension}`
        const path = join(uploadDir, fileName)
        const buffer = Buffer.from(await file.arrayBuffer())
        await writeFile(path, buffer)

        await prisma.supportTicketAttachment.create({
          data: {
            ticketId: ticket.id,
            fileName: file.name,
            fileUrl: `/api/uploads/${fileName}?subdir=support`,
            fileSize: file.size,
            mimeType: file.type
          }
        })
      }
    }

    // Send notifications to all active admin/developer users
    const adminBranchRoles = await prisma.userBranchRole.findMany({
      where: {
        role: {
          name: {
            in: ["Super Admin", "Yonetim Kurulu Uyesi", "Genel Mudur"]
          }
        },
        user: {
          isActive: true
        }
      },
      select: {
        userId: true
      }
    })
    const adminUserIds = Array.from(new Set(adminBranchRoles.map(r => r.userId)))

    for (const adminId of adminUserIds) {
      await createNotification({
        userId: adminId,
        title: `${priority === "critical" ? "⚠️ KRİTİK: " : ""}${escapedTitle}`,
        message: `${auth.username} yeni bir teknik destek talebi oluşturdu.`,
        type: priority === "critical" ? "error" : "info",
        moduleType: "support",
        link: `/dashboard/support-tickets`
      }).catch(err => console.error("Could not trigger support notification to admin:", adminId, err))
    }

    return NextResponse.json({ success: true, ticketId: ticket.id })
  } catch (error) {
    console.error("Create support ticket error:", error)
    return NextResponse.json({ error: "İstek işlenirken sunucuda bir hata oluştu." }, { status: 500 })
  }
}

// GET /api/support-tickets - List tickets (paginated, filtered, sort by date)
export async function GET(req: Request) {
  const auth = await getAuthPayload()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = parseInt(searchParams.get("limit") || "10", 10)
  const skip = (page - 1) * limit

  // Filters
  const status = searchParams.get("status")
  const priority = searchParams.get("priority")
  const category = searchParams.get("category")
  const reporterUserId = searchParams.get("reporterUserId")
  const dateStart = searchParams.get("dateStart")
  const dateEnd = searchParams.get("dateEnd")

  // Check roles
  const isAdmin = await isSuperAdminUser(auth.userId)

  // Construct query where clause
  const where: any = {
    isDeleted: false
  }

  // Normal users can only see their own tickets
  if (!isAdmin) {
    where.reporterUserId = auth.userId
  } else if (reporterUserId) {
    where.reporterUserId = reporterUserId
  }

  if (status) where.status = status
  if (priority) where.priority = priority
  if (category) where.category = category

  // Date range filtering
  if (dateStart || dateEnd) {
    where.createdAt = {}
    if (dateStart) {
      where.createdAt.gte = new Date(dateStart)
    }
    if (dateEnd) {
      where.createdAt.lte = new Date(dateEnd)
    }
  }

  try {
    const [tickets, totalCount] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc"
        },
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true
            }
          },
          assignedUser: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true
            }
          },
          attachments: true
        }
      }),
      prisma.supportTicket.count({ where })
    ])

    return NextResponse.json({
      tickets,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })
  } catch (error) {
    console.error("List support tickets error:", error)
    return NextResponse.json({ error: "Veriler getirilirken sunucuda bir hata oluştu." }, { status: 500 })
  }
}
