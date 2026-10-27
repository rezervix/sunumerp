import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"
import { generateWithRotation } from "@/lib/gemini"

export async function GET(req: Request) {
  // Ensure the user has manager/coordinator access (perm level: read dashboard)
  const auth = await requirePermission("dashboard", "read")
  if (auth instanceof NextResponse) {
    return auth
  }

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)

  try {
    // 1. Fetch messages sent in client groups today
    const messages = await prisma.message.findMany({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
        conversation: { branchId: { not: null } },
        isDeleted: false,
      },
      include: {
        fromUser: { select: { id: true, fullName: true, position: true, department: true } },
        conversation: true,
      },
      orderBy: { createdAt: "asc" },
    })

    if (messages.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // Fetch branches to map them manually since there is no direct Prisma relation on ChatConversation
    const branches = await prisma.branch.findMany({
      select: { id: true, name: true }
    })
    const branchMap = new Map(branches.map(b => [b.id, b]))

    // 2. Prepare message log for Gemini to extract external requests
    const formattedMessages = messages.map((m) => {
      const branch = m.conversation.branchId ? branchMap.get(m.conversation.branchId) : null
      return {
        conversationName: m.conversation.name || "Grup",
        branchName: branch?.name || "Bilinmeyen Müşteri",
        branchId: branch?.id || null,
        senderName: m.fromUser.fullName,
        senderPosition: m.fromUser.position || "Müşteri Temsilcisi / Diğer",
        content: m.content,
        time: m.createdAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
      }
    })

    const prompt = `Aşağıda bugün dijital ajansın müşteri WhatsApp gruplarında (veya şube kanallarında) paylaşılan konuşma kayıtları yer almaktadır.
Görevin, bu konuşmalar içinden SADECE müşterilerin/marka temsilcilerinin (ajans ekibinden olmayan kişilerin) dile getirdiği somut istekleri, talepleri, revizyon isteklerini veya yeni sipariş/asset iletimlerini tespit etmek ve özetlemektir.

Kurallar:
- Ajans içi çalışanların (editör, tasarımcı, sosyal medya yöneticisi, koordinatör vb.) birbirine yazdığı mesajları veya müşteriye verdiği durum bilgilendirmelerini dikkate alma.
- Sadece müşterinin "istiyorum, yapar mısınız, şunu ekleyin, şunlar geldi, video ektedir" gibi eyleme yönelik taleplerini ayıkla.
- Her talebi kimin, saat kaçta ilettiği bilgisiyle beraber anlaşılır ve akıcı bir Türkçe cümle ile özetle.
- Talepleri müşteri/marka (Branch) bazında gruplandır.

Konuşma Kayıtları:
${JSON.stringify(formattedMessages, null, 2)}

Çıktıyı kesinlikle sadece aşağıdaki JSON şemasında döndür. JSON harici hiçbir açıklama veya markdown biçimlendirmesi yazma.
[
  {
    "branchId": "ilgili branch ID'si (UUID)",
    "branchName": "Marka Adı (Örn: Ova Kahvaltı)",
    "requests": [
      {
        "sender": "Mesajı gönderen kişi",
        "time": "Mesajın iletildiği saat (Örn: 14:32)",
        "summary": "Talebin kısa ve net özeti"
      }
    ]
  }
]`;

    let customerRequests = []
    try {
      const response = await generateWithRotation(
        prompt,
        "gemini-2.5-flash",
        "Sen müşteri ilişkileri asistanısın. Sadece geçerli JSON çıktısı üretirsin.",
        {
          type: "array",
          items: {
            type: "object",
            properties: {
              branchId: { type: "string", nullable: true },
              branchName: { type: "string" },
              requests: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    sender: { type: "string" },
                    time: { type: "string" },
                    summary: { type: "string" },
                  },
                  required: ["sender", "time", "summary"],
                },
              },
            },
            required: ["branchId", "branchName", "requests"],
          },
        }
      )

      if (response) {
        customerRequests = JSON.parse(response)
      }
    } catch (error) {
      console.error("Gemini failed to extract customer requests:", error)
      return NextResponse.json({ error: "Yapay zeka talepleri özetleyemedi." }, { status: 500 })
    }

    return NextResponse.json({ data: customerRequests })
  } catch (error) {
    console.error("Error in customer requests endpoint:", error)
    return NextResponse.json({ error: "Sunucu hatası oluştu." }, { status: 500 })
  }
}
