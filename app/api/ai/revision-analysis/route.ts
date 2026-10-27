import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"
import { generateWithRotation } from "@/lib/gemini"

const analysisSchema = z.object({
  branchId: z.string(),
  customerName: z.string().optional(),
  text: z.string().min(20),
})

const getDefaultAnalysis = (text: string) => {
  const lower = text.toLowerCase()
  const collect = (pattern: RegExp) => {
    const matches = Array.from(lower.matchAll(pattern)).map((m) => m[0].trim())
    return [...new Set(matches)].slice(0, 4)
  }

  const preferences = collect(/(?:tercih|sev(i|y)o|istiyor|arzu|beğen|beğeni|tarz|stil|enerji|renk|natürel|minimal|modern|klasik|şık|zarif|canlı|soft|pastel).{0,80}/g)
  const redFlags = collect(/(?:kesinlikle|olmamalı|istemiyor|hassas|fazla|çok|uygunsuz|riskli|zorunlu değil).{0,80}/g)

  return {
    summary:
      "Metin yapısına göre müşteri istekleri ve çekinmeleri analiz edildi. AI anahtar kelimeler bulunamadığında en yakın eşleşmeler sunuldu.",
    preferences: preferences.length > 0 ? preferences : ["Açık bir tercih ifadesi tespit edilemedi."],
    redFlags: redFlags.length > 0 ? redFlags : ["Net bir red-flag ifadesi bulunamadı."],
  }
}

async function analyzeWithAi(text: string) {
  const prompt = `Aşağıdaki müşteri WhatsApp sohbetini analiz et. Metinden:
1) Müşterinin estetik tercihleri ve beğenileri
2) Tarz ve renk algısı
3) Hassasiyetleri ve özel hassasiyetleri
4) Kesinlikle istenmeyen "red flag" unsurları

Çıktıyı sadece JSON formatında ver. Anahtarlar:
{
  "summary": string,
  "preferences": [string],
  "redFlags": [string]
}

Metin:\n${text}`

  try {
    const response = await generateWithRotation(
      prompt,
      "gemini-2.5-flash",
      undefined,
      {
        type: "object",
        properties: {
          summary: { type: "string" },
          preferences: { type: "array", items: { type: "string" } },
          redFlags: { type: "array", items: { type: "string" } },
        },
        required: ["summary", "preferences", "redFlags"],
      }
    )

    if (!response) return getDefaultAnalysis(text)

    try {
      const parsed = JSON.parse(response)
      return {
        summary: typeof parsed.summary === "string" ? parsed.summary : getDefaultAnalysis(text).summary,
        preferences: Array.isArray(parsed.preferences) ? parsed.preferences : getDefaultAnalysis(text).preferences,
        redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : getDefaultAnalysis(text).redFlags,
      }
    } catch {
      return getDefaultAnalysis(text)
    }
  } catch (error) {
    console.warn("AI analiz başarısız oldu, fallback kullanılıyor", error)
    return getDefaultAnalysis(text)
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get("branchId")
  if (!branchId) return NextResponse.json({ error: "branchId gerekli" }, { status: 400 })

  const auth = await requirePermission("ai", "read", branchId)
  if (auth instanceof NextResponse) return auth

  try {
    const analyses = await prisma.aiRevisionAnalysis.findMany({
      where: { branchId },
      orderBy: { createdAt: "desc" },
      include: { uploadedBy: { select: { id: true, fullName: true } } },
      take: 10,
    })

    const parseJsonArray = (value: unknown) => {
      if (Array.isArray(value)) return value
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value)
          return Array.isArray(parsed) ? parsed : []
        } catch {
          return []
        }
      }
      return []
    }

    return NextResponse.json(
      analyses.map((item) => ({
        ...item,
        preferences: parseJsonArray(item.preferences),
        redFlags: parseJsonArray(item.redFlags),
      }))
    )
  } catch (error) {
    console.error("Revision analysis fetch error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = analysisSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.format() }, { status: 400 })
    }

    const { branchId, customerName, text } = parsed.data
    const auth = await requirePermission("ai", "upload", branchId)
    if (auth instanceof NextResponse) return auth

    const analysis = await analyzeWithAi(text)

    const record = await prisma.aiRevisionAnalysis.create({
      data: {
        branchId,
        uploadedById: auth.payload.userId,
        customerName: customerName || null,
        sourceText: text,
        summary: analysis.summary,
        preferences: JSON.stringify(analysis.preferences),
        redFlags: JSON.stringify(analysis.redFlags),
      },
    })

    return NextResponse.json({
      ...record,
      preferences: analysis.preferences,
      redFlags: analysis.redFlags,
    }, { status: 201 })
  } catch (error) {
    console.error("Revision analysis create error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}
