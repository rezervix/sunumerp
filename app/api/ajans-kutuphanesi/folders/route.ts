/**
 * GET  /api/ajans-kutuphanesi/folders   — Klasör listesi (ağaç)
 * POST /api/ajans-kutuphanesi/folders   — Klasör oluştur
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

export async function GET(req: Request) {
  const auth = await requirePermission("ajans-kutuphanesi", "read")
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get("branchId")

  if (!branchId) return NextResponse.json({ error: "branchId zorunlu" }, { status: 400 })

  const folders = await prisma.libraryFolder.findMany({
    where: { branchId, isTrashed: false },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { files: true, childFolders: true } },
    },
  })

  return NextResponse.json(folders)
}

export async function POST(req: Request) {
  const auth = await requirePermission("ajans-kutuphanesi", "create")
  if (auth instanceof NextResponse) return auth
  const { payload } = auth

  const body = await req.json()
  const { name, branchId, parentFolderId } = body

  if (!name || !branchId) {
    return NextResponse.json({ error: "name ve branchId zorunlu" }, { status: 400 })
  }

  try {
    const folder = await prisma.libraryFolder.create({
      data: {
        name,
        branchId,
        parentFolderId: parentFolderId ?? null,
        createdById: payload.userId,
      },
    })

    await prisma.libraryActivityLog.create({
      data: {
        branchId,
        folderId: folder.id,
        userId: payload.userId,
        action: "upload",
        details: JSON.stringify({ type: "folder", name }),
      },
    })

    return NextResponse.json(folder)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
