import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateWithRotation } from "@/lib/gemini"

export async function GET() {
  try {
    console.log("[TEST-EOD] Starting EOD test data seeding...")

    // 1. Seed Customer User
    await prisma.user.upsert({
      where: { id: "test-customer-user" },
      update: {},
      create: {
        id: "test-customer-user",
        username: "ahmetova",
        password: "password123",
        fullName: "Ahmet Bey (Ova Kahvaltı)",
        position: "Müşteri Temsilcisi",
        isActive: true,
      },
    })

    // 2. Seed Test Branch
    await prisma.branch.upsert({
      where: { id: "test-ova-id" },
      update: {},
      create: {
        id: "test-ova-id",
        name: "Ova Kahvaltı",
        code: "OVA",
        themeColor: "#D97706",
      },
    })

    // Delete any existing test entries to avoid duplicate constraints or clutter
    try {
      await prisma.internalTask.deleteMany({ where: { id: "test-task-1" } })
      await prisma.contentItem.deleteMany({ where: { id: "test-content-1" } })
      await prisma.message.deleteMany({ where: { conversationId: "test-conv-1" } })
      await prisma.chatConversation.deleteMany({ where: { id: "test-conv-1" } })
    } catch (e) {
      // Ignored
    }

    // 3. Create Internal Task completed today
    await prisma.internalTask.create({
      data: {
        id: "test-task-1",
        title: "Ova Kahvaltı için 6 adet Sosyal Medya post görseli tasarımı",
        description: "6 adet post tasarımı hazırlanacak ve WhatsApp grubuna atılacak.",
        status: "DONE",
        assigneeId: "local-debug-user",
        assignerId: "local-debug-user",
        branchId: "test-ova-id",
      },
    })

    await prisma.internalTaskStatusLog.create({
      data: {
        taskId: "test-task-1",
        userId: "local-debug-user",
        status: "COMPLETE",
        note: "6 adet post tasarımı tamamlandı ve onaya sunuldu.",
      },
    })

    // 4. Create Content Item worked on today
    await prisma.contentItem.create({
      data: {
        id: "test-content-1",
        title: "Ova Kahvaltı Reels Videosu - Akış Paylaşımı",
        contentType: "reels",
        status: "published",
        branchId: "test-ova-id",
        createdById: "local-debug-user",
        scheduledDate: new Date(),
        platforms: JSON.stringify(["instagram"]),
      },
    })

    // 5. Create Chat Conversation and messages
    await prisma.chatConversation.create({
      data: {
        id: "test-conv-1",
        type: "group",
        name: "Ova Kahvaltı WhatsApp Grubu",
        branchId: "test-ova-id",
        createdById: "local-debug-user",
      },
    })

    // Staff message
    await prisma.message.create({
      data: {
        conversationId: "test-conv-1",
        fromUserId: "local-debug-user",
        content: "Merhabalar, bugünkü 6 post tasarımı onaylandı ve akışa alındı.",
        contentType: "text",
        createdAt: new Date(),
      },
    })

    // Customer request message
    await prisma.message.create({
      data: {
        conversationId: "test-conv-1",
        fromUserId: "test-customer-user",
        content: "Elinize sağlık çok güzel olmuşlar. Son gönderdiğim Ova Kahvaltı video ve görsellerini de inceleyip reels montajı haline getirebilir misiniz?",
        contentType: "text",
        createdAt: new Date(),
      },
    })

    console.log("[TEST-EOD] Mock data seeded successfully. Testing endpoints...")

    // 6. Test /api/eod/draft logic
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const tasks = await prisma.internalTask.findMany({
      where: {
        assigneeId: "local-debug-user",
        OR: [
          { updatedAt: { gte: startOfDay, lte: endOfDay } },
          { statusLogs: { some: { userId: "local-debug-user", startedAt: { gte: startOfDay, lte: endOfDay } } } },
        ],
      },
      include: { branch: true },
    })

    const contentItems = await prisma.contentItem.findMany({
      where: {
        OR: [{ shooterId: "local-debug-user" }, { createdById: "local-debug-user" }],
        updatedAt: { gte: startOfDay, lte: endOfDay },
      },
      include: { branch: true },
    })

    const messages = await prisma.message.findMany({
      where: {
        fromUserId: "local-debug-user",
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        conversation: true,
      },
    })

    // Compile prompt for report
    const tasksData = tasks.map((t) => ({ title: t.title, branchName: t.branch?.name }))
    const contentsData = contentItems.map((c) => ({ title: c.title, branchName: c.branch?.name }))
    const chatsData = messages.map((m) => ({ content: m.content, branchName: undefined }))

    const eodPrompt = `Sen bir dijital ajansın EOD rapor asistanısın. Aşağıdaki verileri şube bazlı temiz Türkçe cümlelerle grupla.
    Tasks: ${JSON.stringify(tasksData)}
    Calendar: ${JSON.stringify(contentsData)}
    Chats: ${JSON.stringify(chatsData)}
    
    Çıktıyı sadece JSON olarak ver: [{ branchName, items: [string] }]`

    let eodCompiled = []
    let eodFallbackUsed = false
    try {
      const eodResponseRaw = await generateWithRotation(
        eodPrompt,
        "gemini-2.5-flash",
        "Sadece JSON dizisi döndür."
      )
      eodCompiled = JSON.parse(eodResponseRaw)
    } catch (err) {
      console.warn("[TEST-EOD] Gemini compile failed, using fallback mock", err)
      eodFallbackUsed = true
      eodCompiled = [
        {
          branchName: "Ova Kahvaltı",
          items: [
            "Ova Kahvaltı için 6 adet Sosyal Medya post görseli tasarımı tamamlandı.",
            "Ova Kahvaltı Reels Videosu paylaşıldı."
          ]
        }
      ]
    }

    // 7. Test Customer Requests logic
    const customerMessages = await prisma.message.findMany({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
        conversation: { branchId: { not: null } },
        fromUserId: "test-customer-user",
      },
      include: {
        conversation: true,
      },
    })

    const customerLogs = customerMessages.map((m) => ({
      branchName: "Test Şubesi",
      sender: "Ahmet Bey",
      content: m.content,
    }))

    const reqPrompt = `Aşağıdaki müşteri mesajlarından sadece müşteri isteklerini ve taleplerini özetle.
    Mesajlar: ${JSON.stringify(customerLogs)}
    
    Çıktıyı sadece JSON olarak ver: [{ branchName, requests: [{ sender, summary }] }]`

    let requestsCompiled = []
    let requestsFallbackUsed = false
    try {
      const reqResponseRaw = await generateWithRotation(
        reqPrompt,
        "gemini-2.5-flash",
        "Sadece JSON dizisi döndür."
      )
      requestsCompiled = JSON.parse(reqResponseRaw)
    } catch (err) {
      console.warn("[TEST-EOD] Gemini requests failed, using fallback mock", err)
      requestsFallbackUsed = true
      requestsCompiled = [
        {
          branchName: "Ova Kahvaltı",
          requests: [
            {
              sender: "Ahmet Bey",
              time: "17:49",
              summary: "Ova Kahvaltı video ve görsellerinin incelenerek reels montajı haline getirilmesini istedi."
            }
          ]
        }
      ]
    }

    return NextResponse.json({
      success: true,
      seededData: {
        tasksCount: tasks.length,
        contentItemsCount: contentItems.length,
        messagesCount: messages.length,
      },
      eodReportDraftResult: eodCompiled,
      eodFallbackUsed,
      customerRequestsResult: requestsCompiled,
      requestsFallbackUsed,
    })

  } catch (error: any) {
    console.error("[TEST-EOD] Error running EOD tests:", error)
    return NextResponse.json({
      success: false,
      error: error?.message || String(error),
    }, { status: 500 })
  }
}
