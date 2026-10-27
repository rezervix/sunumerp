/**
 * POST /api/ajans-kutuphanesi/upload/[uploadId]/chunk
 * Tek bir chunk'ı diske yazar
 */
import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth/server-permission"
import { buildChunkPath, ensureStorageDirs } from "@/lib/storage/ajans-library"
import fs from "fs"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  const auth = await requirePermission("ajans-kutuphanesi", "create")
  if (auth instanceof NextResponse) return auth

  ensureStorageDirs()

  const { uploadId } = await params
  const { searchParams } = new URL(req.url)
  const chunkIndex = parseInt(searchParams.get("index") ?? "0", 10)

  if (!uploadId || isNaN(chunkIndex)) {
    return NextResponse.json({ error: "Geçersiz parametre" }, { status: 400 })
  }

  try {
    const arrayBuffer = await req.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (buffer.length === 0) {
      return NextResponse.json({ error: "Boş chunk" }, { status: 400 })
    }

    const chunkPath = buildChunkPath(uploadId, chunkIndex)
    await fs.promises.writeFile(chunkPath, buffer)

    return NextResponse.json({ success: true, chunkIndex, size: buffer.length })
  } catch (err: any) {
    console.error("Chunk upload error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
