/**
 * GET  /api/ajans-kutuphanesi/files  — Dosya listesi (filtre + arama)
 * DELETE /api/ajans-kutuphanesi/files  — Toplu soft-delete
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

export async function GET(req: Request) {
  const auth = await requirePermission("ajans-kutuphanesi", "read")
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get("branchId")
  const folderId = searchParams.get("folderId") ?? undefined
  const search = searchParams.get("search") ?? ""
  const mimeCategory = searchParams.get("mimeCategory") ?? ""
  const isTrash = searchParams.get("trash") === "true"
  const isStarred = searchParams.get("starred") === "true"
  const page = parseInt(searchParams.get("page") ?? "1", 10)
  const limit = parseInt(searchParams.get("limit") ?? "50", 10)
  const sortBy = searchParams.get("sortBy") ?? "createdAt"
  const sortDir = (searchParams.get("sortDir") ?? "desc") as "asc" | "desc"

  if (!branchId) {
    return NextResponse.json({ error: "branchId zorunlu" }, { status: 400 })
  }

  try {
    // Filtre koşulları
    const where: any = {
      branchId,
      isTrashed: isTrash,
      parentFileId: null, // Sadece son versiyonlar (parent olmayan)
    }

    if (!isTrash) {
      where.folderId = folderId ?? null
    }

    if (isStarred) where.isStarred = true

    if (search) {
      where.originalName = { contains: search, mode: "insensitive" }
    }

    if (mimeCategory) {
      const categoryMap: Record<string, string[]> = {
        image: ["image/"],
        video: ["video/"],
        audio: ["audio/"],
        document: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats",
          "text/",
        ],
        archive: ["application/zip", "application/x-rar", "application/x-7z"],
      }
      const prefixes = categoryMap[mimeCategory]
      if (prefixes) {
        where.mimeType = {
          in: undefined,
          // PostgreSQL için: startsWith yerine contains ile basit filtre
        }
        // Prisma'nın OR filtresiyle
        where.OR = prefixes.map((p) => ({ mimeType: { startsWith: p } }))
      }
    }

    const [files, total] = await Promise.all([
      prisma.libraryFile.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          uploadedBy: { select: { id: true, fullName: true, avatarUrl: true } },
          contentCalendar: { select: { id: true, title: true } },
          _count: { select: { fileVersions: true, derivedFiles: true } },
        },
      }),
      prisma.libraryFile.count({ where }),
    ])

    // Klasörler (aynı filtrelerle)
    const folderWhere: any = {
      branchId,
      isTrashed: isTrash,
    }
    if (!isTrash) {
      folderWhere.parentFolderId = folderId ?? null
    }
    if (search) {
      folderWhere.name = { contains: search, mode: "insensitive" }
    }

    const folders = await prisma.libraryFolder.findMany({
      where: folderWhere,
      orderBy: { name: "asc" },
      include: {
        _count: { select: { files: true, childFolders: true } },
      },
    })

    return NextResponse.json({
      files: files.map((f) => ({ ...f, sizeBytes: Number(f.sizeBytes) })),
      folders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err: any) {
    console.error("Files GET error:", err)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}
