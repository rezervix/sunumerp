/**
 * GET /api/ajans-kutuphanesi/stats
 * Disk kullanımı ve dosya istatistikleri
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"
import { calculateDiskUsage } from "@/lib/storage/ajans-library"

export async function GET(req: Request) {
  const auth = await requirePermission("ajans-kutuphanesi", "read")
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get("branchId")

  if (!branchId) return NextResponse.json({ error: "branchId zorunlu" }, { status: 400 })

  try {
    const [fileCount, folderCount, totalSizeResult, typeBreakdown, recentFiles] =
      await Promise.all([
        prisma.libraryFile.count({ where: { branchId, isTrashed: false } }),
        prisma.libraryFolder.count({ where: { branchId, isTrashed: false } }),
        prisma.libraryFile.aggregate({
          where: { branchId, isTrashed: false },
          _sum: { sizeBytes: true },
        }),
        // Tür bazında dağılım
        prisma.$queryRaw<{ mime_prefix: string; count: bigint; total_size: bigint }[]>`
          SELECT 
            CASE 
              WHEN "mimeType" LIKE 'image/%' THEN 'image'
              WHEN "mimeType" LIKE 'video/%' THEN 'video'
              WHEN "mimeType" LIKE 'audio/%' THEN 'audio'
              WHEN "mimeType" LIKE 'application/pdf' THEN 'document'
              WHEN "mimeType" LIKE 'application/vnd%' THEN 'document'
              WHEN "mimeType" LIKE 'application/ms%' THEN 'document'
              WHEN "mimeType" LIKE 'text/%' THEN 'document'
              WHEN "mimeType" LIKE 'application/zip%' OR "mimeType" LIKE 'application/x-rar%' THEN 'archive'
              ELSE 'other'
            END as mime_prefix,
            COUNT(*) as count,
            SUM("sizeBytes") as total_size
          FROM "LibraryFile"
          WHERE "branchId" = ${branchId} AND "isTrashed" = false
          GROUP BY mime_prefix
        `,
        prisma.libraryFile.findMany({
          where: { branchId, isTrashed: false },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            createdAt: true,
            uploadedBy: { select: { fullName: true } },
          },
        }),
      ])

    const totalSizeBytes = Number(totalSizeResult._sum.sizeBytes ?? 0)
    const diskUsage = await calculateDiskUsage()

    return NextResponse.json({
      fileCount,
      folderCount,
      totalSizeBytes,
      diskUsageBytes: diskUsage,
      typeBreakdown: typeBreakdown.map((r) => ({
        type: r.mime_prefix,
        count: Number(r.count),
        sizeBytes: Number(r.total_size),
      })),
      recentFiles: recentFiles.map((f) => ({
        ...f,
        sizeBytes: Number(f.sizeBytes),
      })),
    })
  } catch (err: any) {
    console.error("Stats error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
