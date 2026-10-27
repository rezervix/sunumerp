import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"
import { generateWithRotation } from "@/lib/gemini"

export async function GET(req: Request) {
  const auth = await requirePermission("dashboard", "read")
  if (auth instanceof NextResponse) {
    return auth
  }
  const userId = auth.payload.userId

  const { searchParams } = new URL(req.url)
  const forceRegenerate = searchParams.get("regenerate") === "true"

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)

  try {
    // 1. Check if a report already exists for today
    const existingReport = await prisma.eodReport.findUnique({
      where: {
        userId_reportDate: {
          userId,
          reportDate: startOfDay,
        },
      },
    })

    if (existingReport && !forceRegenerate) {
      return NextResponse.json({
        id: existingReport.id,
        status: existingReport.status,
        autoContent: JSON.parse(existingReport.autoContent),
        manualContent: existingReport.manualContent,
        submittedAt: existingReport.submittedAt,
        isExisting: true,
      })
    }

    // 2. Gather activities
    // 2.1 Tasks completed or updated today
    const tasks = await prisma.internalTask.findMany({
      where: {
        assigneeId: userId,
        OR: [
          { updatedAt: { gte: startOfDay, lte: endOfDay } },
          { statusLogs: { some: { userId, startedAt: { gte: startOfDay, lte: endOfDay } } } },
        ],
      },
      include: {
        branch: { select: { id: true, name: true } },
        statusLogs: {
          where: { userId, startedAt: { gte: startOfDay, lte: endOfDay } },
        },
      },
    })

    // 2.2 Content items worked on today
    const contentItems = await prisma.contentItem.findMany({
      where: {
        OR: [
          { shooterId: userId },
          { editorId: userId },
          { managerId: userId },
          { designerId: userId },
          { createdById: userId },
        ],
        updatedAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        branch: { select: { id: true, name: true } },
      },
    })

    // 2.3 Messages sent in group channels today
    const messages = await prisma.message.findMany({
      where: {
        fromUserId: userId,
        createdAt: { gte: startOfDay, lte: endOfDay },
        conversation: { branchId: { not: null } },
      },
      include: {
        conversation: true,
      },
    })

    const branches = await prisma.branch.findMany({
      select: { id: true, name: true }
    })
    const branchMap = new Map(branches.map(b => [b.id, b]))

    // 3. Prepare data format for LLM
    const tasksData = tasks.map((t) => ({
      title: t.title,
      description: t.description,
      status: t.status,
      branchId: t.branch?.id || null,
      branchName: t.branch?.name || "Genel / Şube Dışı",
      logs: t.statusLogs.map((l) => ({ status: l.status, note: l.note })),
    }))

    const contentsData = contentItems.map((c) => ({
      title: c.title,
      contentType: c.contentType,
      status: c.status,
      branchId: c.branch?.id || null,
      branchName: c.branch?.name || "Genel / Şube Dışı",
      updatedAt: c.updatedAt,
    }))

    const chatsData = messages.map((m) => {
      const branch = m.conversation.branchId ? branchMap.get(m.conversation.branchId) : null
      return {
        content: m.content,
        branchId: branch?.id || null,
        branchName: branch?.name || "Genel / Şube Dışı",
        time: m.createdAt,
      }
    })

    // Return early if there is absolutely no activity
    if (tasksData.length === 0 && contentsData.length === 0 && chatsData.length === 0) {
      const defaultDraft = [
        {
          branchId: null,
          branchName: "Genel / Şube Dışı",
          items: ["Bugün herhangi bir ERP aktivitesi (görev, içerik paylaşımı, sohbet mesajı) tespit edilmedi."],
        },
      ]

      return NextResponse.json({
        status: "draft",
        autoContent: defaultDraft,
        manualContent: "",
        submittedAt: null,
        isExisting: false,
      })
    }

    // 4. Generate structured EOD draft using Gemini
    const prompt = `Sen bir dijital ajans ERP sisteminin Gün Sonu Raporlama AI asistanısın.
Aşağıda bir personelin bugün yaptığı işlerin ham veri dökümü bulunmaktadır. Görevin, bu ham veriyi temiz, profesyonel, akıcı Türkçe cümlelerle yazılmış bir "Gün Sonu Raporu" taslağı haline getirmektir.

Şirketimizin standart raporlama stili şu şekildedir:
- Somut ve sayılabilir teslimatları belirt (Ör: "6 adet post tasarımı yapıldı", "2 adet motion post kurgulandı").
- Pasif/edilgen eylemler yerine aktif ve profesyonel ifadeler kullan (Ör: "Ova Kahvaltı için hazırlanan 3 adet story tasarımı tamamlandı").
- Gereksiz sohbet detaylarını veya teknik hata mesajlarını ayıkla. Sadece işin özünü ve durumunu yaz (Ör: "WhatsApp grubu üzerinden gelen revizyon talepleri uygulandı").
- Raporu müşteri/marka (Branch) bazında gruplandır.
- Aynı iş hem görevlerde hem içerik takviminde geçiyorsa, çift sayım yapma, tek bir akıcı maddede birleştir.

Ham Veri Dökümü:
1. Görevler (Internal Tasks):
${JSON.stringify(tasksData, null, 2)}

2. İçerik Takvimi (Content Calendar):
${JSON.stringify(contentsData, null, 2)}

3. İlgili Müşteri Gruplarında Atılan Mesajlar (Chat Logs):
${JSON.stringify(chatsData, null, 2)}

Çıktıyı sadece JSON formatında ver. JSON formatı kesinlikle şu şemaya uymalıdır:
[
  {
    "branchId": "şubenin UUID'si (varsa, yoksa null)",
    "branchName": "Şubenin/Markanın adı (e.g. 'Ova Kahvaltı')",
    "items": ["yapılan iş maddesi 1", "yapılan iş maddesi 2"]
  }
]

Not: JSON çıktısı haricinde hiçbir açıklama, markdown etiketi veya önsöz yazma. Sadece geçerli bir JSON array döndür.`

    let autoContent = []
    try {
      const response = await generateWithRotation(
        prompt,
        "gemini-2.5-flash",
        "Sen profesyonel bir ajans raporlama asistanısın. Sadece geçerli JSON çıktısı üretirsin.",
        {
          type: "array",
          items: {
            type: "object",
            properties: {
              branchId: { type: "string", nullable: true },
              branchName: { type: "string" },
              items: { type: "array", items: { type: "string" } },
            },
            required: ["branchId", "branchName", "items"],
          },
        }
      )

      if (response) {
        autoContent = JSON.parse(response)
      } else {
        throw new Error("Gemini returned empty response")
      }
    } catch (error) {
      console.error("Gemini EOD compilation failed, using fallback:", error)
      // Fallback rule-based grouping
      const branchesMap: Record<string, { name: string; items: string[] }> = {}

      const getBranchKey = (bId: string | null, bName: string) => {
        return bId || bName || "null"
      }

      // Group Tasks
      tasksData.forEach((t) => {
        const key = getBranchKey(t.branchId, t.branchName)
        if (!branchesMap[key]) {
          branchesMap[key] = { name: t.branchName, items: [] }
        }
        branchesMap[key].items.push(`'${t.title}' görevi üzerinde çalışıldı (Durum: ${t.status}).`)
      })

      // Group Content Items
      contentsData.forEach((c) => {
        const key = getBranchKey(c.branchId, c.branchName)
        if (!branchesMap[key]) {
          branchesMap[key] = { name: c.branchName, items: [] }
        }
        branchesMap[key].items.push(`'${c.title}' adlı ${c.contentType} içeriği güncellendi (Durum: ${c.status}).`)
      })

      // Group Chats
      chatsData.forEach((ch) => {
        const key = getBranchKey(ch.branchId, ch.branchName)
        if (!branchesMap[key]) {
          branchesMap[key] = { name: ch.branchName, items: [] }
        }
        if (branchesMap[key].items.length < 5) {
          branchesMap[key].items.push(`Sohbet mesajı iletildi: "${ch.content.slice(0, 40)}..."`)
        }
      })

      autoContent = Object.entries(branchesMap).map(([key, val]) => ({
        branchId: key === "null" || !key.includes("-") ? null : key,
        branchName: val.name,
        items: [...new Set(val.items)],
      }))
    }

    // 5. Save draft in database
    const savedDraft = await prisma.eodReport.upsert({
      where: {
        userId_reportDate: {
          userId,
          reportDate: startOfDay,
        },
      },
      update: {
        autoContent: JSON.stringify(autoContent),
      },
      create: {
        userId,
        reportDate: startOfDay,
        status: "draft",
        autoContent: JSON.stringify(autoContent),
        manualContent: "",
      },
    })

    // Log the draft creation
    await prisma.eodReportAuditLog.create({
      data: {
        reportId: savedDraft.id,
        userId,
        action: "create_draft",
        details: JSON.stringify({ message: "Draft auto-compiled" }),
      },
    })

    return NextResponse.json({
      id: savedDraft.id,
      status: "draft",
      autoContent,
      manualContent: "",
      submittedAt: null,
      isExisting: false,
    })
  } catch (error) {
    console.error("Error generating daily report draft:", error)
    return NextResponse.json({ error: "Gün sonu raporu taslağı oluşturulurken hata meydana geldi." }, { status: 500 })
  }
}
