import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"
import fs from "fs"
import { v4 as uuidv4 } from "uuid"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  const payload = await getAuthPayload()
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const isInline = searchParams.get("inline") === "true"
  const versionId = searchParams.get("versionId")

  try {
    const content = await prisma.contentStore.findUnique({ where: { id } })
    if (!content) return NextResponse.json({ error: "Icerik bulunamadi" }, { status: 404 })

    let filePath = content.url
    let mimeType = content.mimeType
    let originalName = content.originalName

    if (versionId) {
      const version = await prisma.contentVersion.findFirst({
        where: { id: versionId, contentStoreId: id }
      })
      if (!version) return NextResponse.json({ error: "Sürüm bulunamadı" }, { status: 404 })
      filePath = version.url
      const parts = content.originalName.split(".")
      const ext = parts.pop()
      const base = parts.join(".")
      originalName = `${base}_v${version.versionNumber}.${ext}`
    }

    if (!fs.existsSync(filePath)) return NextResponse.json({ error: "Dosya bulunamadi" }, { status: 404 })

    if (!isInline) {
      try {
        await prisma.contentAnalyticsEvent.create({
          data: {
            id: uuidv4(),
            contentStoreId: id,
            userId: payload.userId,
            eventType: "download"
          }
        })
        await prisma.contentStore.update({
          where: { id },
          data: { downloadCount: { increment: 1 } }
        })
      } catch (e) {
        console.error("Download tracking error:", e)
      }
    }

    const stat = fs.statSync(filePath)
    const readStream = fs.createReadStream(filePath)
    const webStream = new ReadableStream({
      start(controller) {
        readStream.on("data", (chunk) => controller.enqueue(chunk))
        readStream.on("end", () => controller.close())
        readStream.on("error", (err) => controller.error(err))
      },
    })

    const disposition = isInline ? "inline" : `attachment; filename="${encodeURIComponent(originalName)}"`

    return new Response(webStream, {
      headers: {
        "Content-Type": content.mimeType || "application/octet-stream",
        "Content-Length": stat.size.toString(),
        "Content-Disposition": disposition,
        "Cache-Control": "public, max-age=31536000, immutable",
      }
    })
  } catch (err: any) {
    console.error("Content store serve error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}