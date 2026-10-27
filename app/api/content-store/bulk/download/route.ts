import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"
import fs from "fs"
// @ts-ignore
import archiver from "archiver"
import { PassThrough } from "stream"

export async function POST(req: Request) {
  const payload = await getAuthPayload()
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Dosyalar seçilmedi" }, { status: 400 })
    }

    const files = await prisma.contentStore.findMany({
      where: { id: { in: ids } }
    })

    if (files.length === 0) {
      return NextResponse.json({ error: "Dosyalar bulunamadı" }, { status: 404 })
    }

    const validFiles = files.filter(f => {
      const isLocal = !f.url.startsWith("http://") && !f.url.startsWith("https://")
      return isLocal && fs.existsSync(f.url)
    })

    if (validFiles.length === 0) {
      return NextResponse.json({ error: "Geçerli yerel dosya bulunamadı" }, { status: 404 })
    }

    const pass = new PassThrough()
    const archive = archiver("zip", { zlib: { level: 5 } })

    archive.on("error", (err: any) => {
      console.error("ZIP error:", err)
      pass.destroy(err)
    })

    archive.pipe(pass)

    validFiles.forEach((file) => {
      archive.file(file.url, { name: file.originalName })
    })

    archive.finalize()

    return new Response(pass as any, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="icerik_magazasi_${Date.now()}.zip"`
      }
    })
  } catch (err: any) {
    console.error("ZIP download error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
