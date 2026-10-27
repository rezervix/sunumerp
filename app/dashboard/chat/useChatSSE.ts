import { useEffect, useRef } from "react"

export interface SSEMessage {
  id: string
  conversationId: string
  fromUserId: string
  content: string
  contentType: string
  fileUrl?: string
  fileType?: string
  fileName?: string
  fileSize?: number
  fileDuration?: number
  thumbnailUrl?: string
  waveformData?: string
  locationLat?: number
  locationLng?: number
  locationAddress?: string
  locationName?: string
  replyToMessageId?: string
  replyPreviewText?: string
  replyPreviewType?: string
  replyFromUserId?: string
  isForwarded: boolean
  forwardCount: number
  isEdited: boolean
  isDeleted: boolean
  deletedForAll: boolean
  isSelfDestruct: boolean
  selfDestructAt?: string
  isPinned: boolean
  isSystemMessage: boolean
  systemAction?: string
  pollData?: string
  createdAt: string
  fromUser: {
    id: string
    username: string
    fullName: string
    avatarUrl?: string
  }
  replyToMessage?: any
  reactions?: any[]
  readReceipts?: any[]
}

interface UseChatSSEProps {
  conversationIds: string[]
  onNewMessage?: (msg: SSEMessage) => void
  onMessageEdited?: (payload: { message: SSEMessage; pollUpdate?: any }) => void
  onMessageDeleted?: (payload: { messageId: string; forAll: boolean }) => void
  onMessageReaction?: (payload: {
    messageId: string
    action: "added" | "removed"
    emoji: string
    userId: string
    reactions: any[]
  }) => void
  onMessageRead?: (payload: {
    readByUserId: string
    upToMessageId: string
    readAt: string
  }) => void
  onMessagePinned?: (payload: { pinned: any; action: "pinned" | "unpinned"; messageId?: string }) => void
  onTypingStart?: (payload: { userId: string; conversationId: string }) => void
  onTypingStop?: (payload: { userId: string; conversationId: string }) => void
  onRecordingStart?: (payload: { userId: string; conversationId: string }) => void
  onRecordingStop?: (payload: { userId: string; conversationId: string }) => void
  onPresenceUpdate?: (payload: { userId: string; isOnline: boolean; lastSeenAt: string }) => void
  onConversationUpdated?: (payload: { conversation: any; changedBy: string }) => void
  onParticipantAdded?: (payload: { addedUserIds: string[]; addedBy: string; addedUsers?: any[] }) => void
  onParticipantRemoved?: (payload: { removedUserId: string; removedBy: string; removedSelf: boolean }) => void
  onParticipantRoleChanged?: (payload: { userId: string; role: string; changedBy: string }) => void
  onConversationCreated?: (payload: { conversation: any }) => void
}

export function useChatSSE({
  conversationIds,
  onNewMessage,
  onMessageEdited,
  onMessageDeleted,
  onMessageReaction,
  onMessageRead,
  onMessagePinned,
  onTypingStart,
  onTypingStop,
  onRecordingStart,
  onRecordingStop,
  onPresenceUpdate,
  onConversationUpdated,
  onParticipantAdded,
  onParticipantRemoved,
  onParticipantRoleChanged,
  onConversationCreated,
}: UseChatSSEProps) {
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    // Tarayıcı ortamında çalışıp çalışmadığını kontrol et
    if (typeof window === "undefined") return

    const idsParam = conversationIds.filter(Boolean).join(",")
    const url = `/api/chat/sse${idsParam ? `?conversationIds=${idsParam}` : ""}`

    const es = new EventSource(url)
    eventSourceRef.current = es

    // Event listeners
    es.addEventListener("new_message", (e: any) => {
      try {
        const data = JSON.parse(e.data)
        onNewMessage?.(data.message)
      } catch (err) {
        console.error("SSE new_message parse error", err)
      }
    })

    es.addEventListener("message_edited", (e: any) => {
      try {
        const data = JSON.parse(e.data)
        onMessageEdited?.({ message: data.message, pollUpdate: data.pollUpdate })
      } catch (err) {
        console.error("SSE message_edited parse error", err)
      }
    })

    es.addEventListener("message_deleted", (e: any) => {
      try {
        const data = JSON.parse(e.data)
        onMessageDeleted?.({ messageId: data.messageId, forAll: data.forAll })
      } catch (err) {
        console.error("SSE message_deleted parse error", err)
      }
    })

    es.addEventListener("message_reaction", (e: any) => {
      try {
        const data = JSON.parse(e.data)
        onMessageReaction?.({
          messageId: data.messageId,
          action: data.action,
          emoji: data.emoji,
          userId: data.userId,
          reactions: data.reactions,
        })
      } catch (err) {
        console.error("SSE message_reaction parse error", err)
      }
    })

    es.addEventListener("message_read", (e: any) => {
      try {
        const data = JSON.parse(e.data)
        onMessageRead?.({
          readByUserId: data.readByUserId,
          upToMessageId: data.upToMessageId,
          readAt: data.readAt,
        })
      } catch (err) {
        console.error("SSE message_read parse error", err)
      }
    })

    es.addEventListener("message_pinned", (e: any) => {
      try {
        const data = JSON.parse(e.data)
        onMessagePinned?.({
          pinned: data.pinned,
          action: data.action,
          messageId: data.messageId,
        })
      } catch (err) {
        console.error("SSE message_pinned parse error", err)
      }
    })

    es.addEventListener("typing_start", (e: any) => {
      try {
        const data = JSON.parse(e.data)
        onTypingStart?.({
          userId: data.userId,
          conversationId: data.conversationId,
        })
      } catch (err) {
        console.error("SSE typing_start parse error", err)
      }
    })

    es.addEventListener("typing_stop", (e: any) => {
      try {
        const data = JSON.parse(e.data)
        onTypingStop?.({
          userId: data.userId,
          conversationId: data.conversationId,
        })
      } catch (err) {
        console.error("SSE typing_stop parse error", err)
      }
    })

    es.addEventListener("recording_start", (e: any) => {
      try {
        const data = JSON.parse(e.data)
        onRecordingStart?.({
          userId: data.userId,
          conversationId: data.conversationId,
        })
      } catch (err) {
        console.error("SSE recording_start parse error", err)
      }
    })

    es.addEventListener("recording_stop", (e: any) => {
      try {
        const data = JSON.parse(e.data)
        onRecordingStop?.({
          userId: data.userId,
          conversationId: data.conversationId,
        })
      } catch (err) {
        console.error("SSE recording_stop parse error", err)
      }
    })

    es.addEventListener("presence_update", (e: any) => {
      try {
        const data = JSON.parse(e.data)
        onPresenceUpdate?.({
          userId: data.userId,
          isOnline: data.isOnline,
          lastSeenAt: data.lastSeenAt,
        })
      } catch (err) {
        console.error("SSE presence_update parse error", err)
      }
    })

    es.addEventListener("conversation_updated", (e: any) => {
      try {
        const data = JSON.parse(e.data)
        onConversationUpdated?.({
          conversation: data.conversation,
          changedBy: data.changedBy,
        })
      } catch (err) {
        console.error("SSE conversation_updated parse error", err)
      }
    })

    es.addEventListener("participant_added", (e: any) => {
      try {
        const data = JSON.parse(e.data)
        onParticipantAdded?.({
          addedUserIds: data.addedUserIds,
          addedBy: data.addedBy,
          addedUsers: data.addedUsers,
        })
      } catch (err) {
        console.error("SSE participant_added parse error", err)
      }
    })

    es.addEventListener("participant_removed", (e: any) => {
      try {
        const data = JSON.parse(e.data)
        onParticipantRemoved?.({
          removedUserId: data.removedUserId,
          removedBy: data.removedBy,
          removedSelf: data.removedSelf,
        })
      } catch (err) {
        console.error("SSE participant_removed parse error", err)
      }
    })

    es.addEventListener("participant_role_changed", (e: any) => {
      try {
        const data = JSON.parse(e.data)
        onParticipantRoleChanged?.({
          userId: data.userId,
          role: data.role,
          changedBy: data.changedBy,
        })
      } catch (err) {
        console.error("SSE participant_role_changed parse error", err)
      }
    })

    es.addEventListener("conversation_created", (e: any) => {
      try {
        const data = JSON.parse(e.data)
        onConversationCreated?.({ conversation: data.conversation })
      } catch (err) {
        console.error("SSE conversation_created parse error", err)
      }
    })

    es.onerror = (err) => {
      console.warn("SSE error or connection closed, retrying...", err)
    }

    return () => {
      es.close()
    }
  }, [
    conversationIds.join(","),
    onNewMessage,
    onMessageEdited,
    onMessageDeleted,
    onMessageReaction,
    onMessageRead,
    onMessagePinned,
    onTypingStart,
    onTypingStop,
    onRecordingStart,
    onRecordingStop,
    onPresenceUpdate,
    onConversationUpdated,
    onParticipantAdded,
    onParticipantRemoved,
    onParticipantRoleChanged,
    onConversationCreated,
  ])
}
