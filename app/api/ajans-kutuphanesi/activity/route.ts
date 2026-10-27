/**
 * GET /api/ajans-kutuphanesi/activity
 * Aktivite logu (kim ne zaman ne yaptı)
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

export async function GET(req: Request) {
  const auth = await requirePermission("ajans-kutuphanesi", "read")
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get("branchId")
  const fileId = searchParams.get("fileId")
  const page = parseInt(searchParams.get("page") ?? "1", 10)
  const limit = parseInt(searchParams.get("limit") ?? "50", 10)

  if (!branchId) return NextResponse.json({ error: "branchId zorunlu" }, { status: 400 })

  const where: any = { branchId }
  if (fileId) where.fileId = fileId

  const [logs, total] = await Promise.all([
    prisma.libraryActivityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
        file: { select: { id: true, originalName: true, mimeType: true } },
        folder: { select: { id: true, name: true } },
      },
    }),
    prisma.libraryActivityLog.count({ where }),
  ])

  return NextResponse.json({ logs, total, page, totalPages: Math.ceil(total / limit) })
}
