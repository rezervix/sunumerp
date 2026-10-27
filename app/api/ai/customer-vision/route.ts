import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"
import { generateWithRotation } from "@/lib/gemini"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { customerId, branchId, text } = body

    if (!customerId || !text) {
      return NextResponse.json({ error: "customerId ve text zorunlu" }, { status: 400 })
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { branchId: true } })
    const effectiveBranchId = branchId || customer?.branchId

    const auth = await requirePermission("ai", "upload", effectiveBranchId)
    if (auth instanceof NextResponse) return auth

    const prompt = `Aşağıdaki müşteri notlarını ve sohbet metnini kullanarak müşteri vizyonunu özetle. Çıktı sadece JSON olsun. Şema: {"summary":"...","preferences":["..."],"redFlags":["..."],"nextActions":["..."]}`

    const aiResponse = await generateWithRotation(`${prompt}\n\nMetin:\n${text}`)

    let parsed: any = {}
    try {
      parsed = JSON.parse(aiResponse)
    } catch {
      parsed = {
        summary: "Müşteri vizyonu kısa bir özet ile oluşturuldu.",
        preferences: [],
        redFlags: [],
        nextActions: [],
      }
    }

    const customerRecord = await prisma.customer.findUnique({ where: { id: customerId } })
    const task = await prisma.customerTask.create({
      data: {
        customerId,
        title: "AI müşteri vizyonu",
        description: parsed.summary || "AI tarafından oluşturulan müşteri vizyonu",
        status: "Fikir / Brief Aşamasında",
        priority: "high",
      },
    })

    await prisma.customerChat.create({
      data: {
        customerId,
        type: "Internal",
        content: `AI müşteri vizyonu: ${parsed.summary || "özet oluşturuldu"}`,
      },
    })

    return NextResponse.json({
      task,
      customer: customerRecord,
      insight: {
        summary: parsed.summary || "",
        preferences: Array.isArray(parsed.preferences) ? parsed.preferences : [],
        redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
        nextActions: Array.isArray(parsed.nextActions) ? parsed.nextActions : [],
      },
    })
  } catch (error) {
    console.error("Customer vision AI error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}
