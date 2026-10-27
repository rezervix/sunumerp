import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

export async function POST(req: Request) {
  const auth = await requirePermission("files", "create")
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const { branchId, contentCalendarId, urls = [] } = body

    if (!branchId || !contentCalendarId || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "branchId, contentCalendarId ve urls zorunlu" }, { status: 400 })
    }

    const uploaded = await Promise.all(
      urls.map((url: string) =>
        prisma.file.create({
          data: {
            branchId,
            name: url.split("/").pop() || "dosya",
            url,
            type: "attachment",
            size: 0,
            uploadedBy: auth.payload?.userId as string | undefined,
            contentCalendarId,
          },
        })
      )
    )

    return NextResponse.json({ uploaded, count: uploaded.length })
  } catch (error) {
    console.error("File attach error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}
