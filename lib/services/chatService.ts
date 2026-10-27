/**
 * Chat SSE (Server-Sent Events) Servisi
 * 
 * Mevcut notificationService.ts'deki EventEmitter pattern'ının aynısını
 * chat sistemi için uygular. Global bir emitter üzerinden tüm bağlı
 * SSE istemcilerine gerçek zamanlı mesajlar gönderir.
 * 
 * Desteklenen event tipleri:
 *  - new_message       : Yeni mesaj gönderildi
 *  - message_edited    : Mesaj düzenlendi
 *  - message_deleted   : Mesaj silindi
 *  - message_reaction  : Reaksiyon eklendi/kaldırıldı
 *  - message_read      : Okundu bilgisi güncellendi
 *  - message_pinned    : Mesaj sabitlendi/kaldırıldı
 *  - typing_start      : Kullanıcı yazmaya başladı
 *  - typing_stop       : Kullanıcı yazmayı bıraktı
 *  - recording_start   : Sesli mesaj kaydı başladı
 *  - recording_stop    : Sesli mesaj kaydı durdu
 *  - presence_update   : Kullanıcı online/offline durumu değişti
 *  - conversation_updated : Grup bilgisi güncellendi
 *  - participant_added   : Gruba üye eklendi
 *  - participant_removed : Gruptan üye çıkarıldı
 *  - participant_role_changed: Üye rolü değişti
 *  - conversation_created: Yeni konuşma/grup oluşturuldu
 */

import { EventEmitter } from "events"

export interface ChatEvent {
  type:
    | "new_message"
    | "message_edited"
    | "message_deleted"
    | "message_reaction"
    | "message_read"
    | "message_pinned"
    | "typing_start"
    | "typing_stop"
    | "recording_start"
    | "recording_stop"
    | "presence_update"
    | "conversation_updated"
    | "participant_added"
    | "participant_removed"
    | "participant_role_changed"
    | "conversation_created"
    | "import_progress"   // WhatsApp import ilerleme durumu
  conversationId?: string           // Hangi konuşmaya ait (broadcast hedefi)
  userId?: string                   // Hangi kullanıcıya ait (presence için)
  targetUserIds?: string[]          // Belirli kullanıcılara gönder
  payload: Record<string, unknown>  // Event'e özgü veri
}

// Global EventEmitter — Next.js hot reload'da tekrar oluşturulmasın
const globalForChatEmitter = global as unknown as { chatEmitter: EventEmitter }

export const chatEmitter: EventEmitter =
  globalForChatEmitter.chatEmitter ?? new EventEmitter()

chatEmitter.setMaxListeners(500) // Çok sayıda SSE bağlantısı için limit artır

if (process.env.NODE_ENV !== "production") {
  globalForChatEmitter.chatEmitter = chatEmitter
}

/**
 * Bir chat event'i emit eder.
 * SSE endpoint'leri bu event'leri dinleyerek bağlı istemcilere iletir.
 */
export function emitChatEvent(event: ChatEvent): void {
  chatEmitter.emit("chat_event", event)
}

/**
 * Aktif SSE bağlantılarını izlemek için kullanılan in-memory store.
 * userId → Set<WritableStreamDefaultWriter> şeklinde.
 * 
 * Not: Bu yaklaşım tek process/pod için çalışır.
 * Çoklu process ortamında Redis Pub/Sub veya benzeri bir çözüm kullanılmalıdır.
 */
interface SseConnection {
  userId: string
  controller: ReadableStreamDefaultController
  conversationIds: Set<string>      // Abone olunan konuşmalar
}

const globalForSseConnections = global as unknown as {
  chatSseConnections: Map<string, SseConnection>
}

export const chatSseConnections: Map<string, SseConnection> =
  globalForSseConnections.chatSseConnections ?? new Map()

if (process.env.NODE_ENV !== "production") {
  globalForSseConnections.chatSseConnections = chatSseConnections
}

/**
 * Bir SSE bağlantısı kaydeder.
 */
export function registerSseConnection(
  connectionId: string,
  userId: string,
  controller: ReadableStreamDefaultController,
  conversationIds: string[] = []
): void {
  chatSseConnections.set(connectionId, {
    userId,
    controller,
    conversationIds: new Set(conversationIds),
  })
}

/**
 * Bir SSE bağlantısını kaldırır.
 */
export function unregisterSseConnection(connectionId: string): void {
  chatSseConnections.delete(connectionId)
}

/**
 * Bir kullanıcının bir konuşmaya abone olmasını sağlar.
 */
export function subscribeToConversation(
  connectionId: string,
  conversationId: string
): void {
  const conn = chatSseConnections.get(connectionId)
  if (conn) {
    conn.conversationIds.add(conversationId)
  }
}

/**
 * SSE formatında mesaj gönderir.
 */
function encodeSseMessage(event: string, data: unknown): Uint8Array {
  const json = JSON.stringify(data)
  return new TextEncoder().encode(`event: ${event}\ndata: ${json}\n\n`)
}

/**
 * Bir event'i ilgili SSE bağlantılarına yayınlar.
 * conversationId üzerinden filtreleme yapılır.
 */
export function broadcastToConnections(chatEvent: ChatEvent): void {
  const { type, conversationId, targetUserIds, payload } = chatEvent

  for (const [connectionId, conn] of chatSseConnections) {
    // Hedef kullanıcı listesi varsa sadece onlara gönder
    if (targetUserIds && !targetUserIds.includes(conn.userId)) continue

    // Konuşma ID'si varsa sadece o konuşmaya abone olanlara gönder
    if (conversationId && !conn.conversationIds.has(conversationId)) continue

    try {
      conn.controller.enqueue(
        encodeSseMessage(type, { conversationId, ...payload })
      )
    } catch {
      // Bağlantı kapanmış — temizle
      chatSseConnections.delete(connectionId)
    }
  }
}

// EventEmitter dinleyicisi — emitChatEvent çağrıldığında broadcastToConnections'ı tetikler
chatEmitter.on("chat_event", broadcastToConnections)
