/**
 * GET /api/chat/sse
 * 
 * Server-Sent Events endpoint — istemci bu endpoint'e bağlanarak
 * gerçek zamanlı chat event'lerini alır.
 * 
 * Query params:
 *  - conversationIds: Virgülle ayrılmış konuşma ID'leri
 *    Örn: ?conversationIds=abc123,def456
 * 
 * Dönen SSE event tipleri: chatService.ts'deki ChatEvent.type ile aynı.
 */
import { NextRequest } from "next/server"
import { getAuthPayload } from "@/lib/auth/server-permission"
import {
  registerSseConnection,
  unregisterSseConnection,
  subscribeToConversation,
  emitChatEvent,
} from "@/lib/services/chatService"
import { prisma } from "@/lib/db"
import { v4 as uuidv4 } from "uuid"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const auth = await getAuthPayload()
  if (!auth) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const conversationIds = searchParams.get("conversationIds")?.split(",").filter(Boolean) ?? []

  // Kullanıcının gerçekten bu konuşmalara erişimi olduğunu doğrula
  if (conversationIds.length > 0) {
    const participations = await prisma.chatParticipant.findMany({
      where: {
        userId: auth.userId,
        conversationId: { in: conversationIds },
        isRemoved: false,
        leftAt: null,
      },
      select: { conversationId: true },
    })
    const allowedIds = new Set(participations.map((p) => p.conversationId))
    // Yetkisiz konuşma ID'lerini filtrele
    const validConversationIds = conversationIds.filter((id) => allowedIds.has(id))
    conversationIds.length = 0
    conversationIds.push(...validConversationIds)
  }

  const connectionId = uuidv4()

  // Kullanıcıyı online olarak işaretle
  await prisma.userPresence.upsert({
    where: { userId: auth.userId },
    create: {
      userId: auth.userId,
      isOnline: true,
      lastSeenAt: new Date(),
      updatedAt: new Date(),
    },
    update: {
      isOnline: true,
      lastSeenAt: new Date(),
      updatedAt: new Date(),
    },
  })

  // Presence değişikliğini ilgili konuşmalara broadcast et
  if (conversationIds.length > 0) {
    emitChatEvent({
      type: "presence_update",
      targetUserIds: undefined, // Tüm bağlı kullanıcılara
      payload: {
        userId: auth.userId,
        isOnline: true,
        lastSeenAt: new Date().toISOString(),
      },
    })
  }

  // ReadableStream oluştur — bağlantı süresince açık kalır
  let controller: ReadableStreamDefaultController
  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl

      // SSE bağlantısını kaydet
      registerSseConnection(connectionId, auth.userId, controller, conversationIds)

      // Bağlantı kurulduğunda connected event gönder
      const connectPayload = JSON.stringify({
        connectionId,
        userId: auth.userId,
        subscribedConversations: conversationIds,
      })
      ctrl.enqueue(
        new TextEncoder().encode(`event: connected\ndata: ${connectPayload}\n\n`)
      )

      // Heartbeat — her 25 saniyede bir boş comment göndererek bağlantı sağlığını koru
      const heartbeat = setInterval(() => {
        try {
          ctrl.enqueue(new TextEncoder().encode(`: heartbeat\n\n`))
        } catch {
          clearInterval(heartbeat)
          unregisterSseConnection(connectionId)
        }
      }, 25_000)

      // İstemci bağlantıyı kestiğinde temizle
      req.signal.addEventListener("abort", async () => {
        clearInterval(heartbeat)
        unregisterSseConnection(connectionId)

        // Kullanıcıyı offline olarak işaretle
        try {
          await prisma.userPresence.upsert({
            where: { userId: auth.userId },
            create: {
              userId: auth.userId,
              isOnline: false,
              lastSeenAt: new Date(),
              updatedAt: new Date(),
            },
            update: {
              isOnline: false,
              lastSeenAt: new Date(),
              updatedAt: new Date(),
            },
          })

          emitChatEvent({
            type: "presence_update",
            payload: {
              userId: auth.userId,
              isOnline: false,
              lastSeenAt: new Date().toISOString(),
            },
          })
        } catch {
          // Bağlantı kesilirken hata olsa da devam et
        }
      })
    },
    cancel() {
      unregisterSseConnection(connectionId)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",         // Nginx proxy buffering'i devre dışı bırak
      "Access-Control-Allow-Origin": "*",
    },
  })
}
