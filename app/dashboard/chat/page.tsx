"use client"

import { useState, useEffect, useRef } from "react"
import { useLanguage } from "@/lib/context/LanguageContext"
import { useAuth } from "@/lib/auth/context"
import { useNotificationStore } from "@/lib/context/NotificationContext"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Subcomponents
import { CreateChatModal } from "./components/CreateChatModal"
import { MessageBubble } from "./components/MessageBubble"
import { MessageInputBar } from "./components/MessageInputBar"
import { DetailPanel } from "./components/DetailPanel"
import { StarredMessagesModal } from "./components/StarredMessagesModal"
import { BlockedListModal } from "./components/BlockedListModal"
import ImportHistoryModal from "./components/ImportHistoryModal"

// SSE Hook
import { useChatSSE, SSEMessage } from "./useChatSSE"

export default function ChatPage() {
  const { t, tText } = useLanguage()
  const { session, currentBranch } = useAuth()
  const { markModuleAsRead } = useNotificationStore()

  // Conversations & Selection
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedConversation, setSelectedConversation] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<"dm" | "group" | "branch_channel" | "broadcast">("dm")
  
  // Messages & Pagination
  const [messages, setMessages] = useState<any[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [loadingMessages, setLoadingMessages] = useState(false)
  
  // Real-time Presence / Statuses
  const [typingUsers, setTypingUsers] = useState<Record<string, Set<string>>>({})
  const [recordingUsers, setRecordingUsers] = useState<Record<string, Set<string>>>({})
  const [userPresences, setUserPresences] = useState<Record<string, { isOnline: boolean; lastSeenAt: string | null }>>({})

  // Modals / Panels
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isStarredOpen, setIsStarredOpen] = useState(false)
  const [isBlockedOpen, setIsBlockedOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  
  // Search & Filter
  const [convSearchQuery, setConvSearchQuery] = useState("")
  const [msgSearchQuery, setMsgSearchQuery] = useState("")
  const [isSearchActive, setIsSearchActive] = useState(false)

  // Reply state
  const [replyMessage, setReplyMessage] = useState<any>(null)

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isInitialLoad = useRef(true)

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])

  // Auto-subscribe to SSE for all conversations
  const convIds = conversations.map((c) => c.id)

  // Synthetic message notification chime
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5 note
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1) // A5 note
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.35)
    } catch {}
  }

  // Bind Server-Sent Events
  useChatSSE({
    conversationIds: convIds,
    onNewMessage: (msg: SSEMessage) => {
      // Append if it's the currently selected chat
      if (selectedConversation && msg.conversationId === selectedConversation.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        markAsRead(msg.id)
        
        // Scroll to bottom
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
          }
        }, 100)
      } else {
        // Increment unread count in background conversation
        setConversations((prev) =>
          prev.map((c) =>
            c.id === msg.conversationId
              ? { ...c, unreadCount: (c.unreadCount || 0) + 1, lastMessage: msg }
              : c
          )
        )
        // Play notification sound
        playChime()
      }
    },
    onMessageEdited: ({ message, pollUpdate }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, ...message } : m))
      )
    },
    onMessageDeleted: ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, isDeleted: true, content: "" } : m
        )
      )
    },
    onMessageReaction: ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      )
    },
    onMessageRead: ({ readByUserId, upToMessageId }) => {
      // Logic for read ticks updates
      setMessages((prev) =>
        prev.map((m) =>
          m.id === upToMessageId || new Date(m.createdAt) <= new Date()
            ? {
                ...m,
                readReceipts: [
                  ...(m.readReceipts || []),
                  { userId: readByUserId, readAt: new Date().toISOString() },
                ],
              }
            : m
        )
      )
    },
    onTypingStart: ({ userId, conversationId }) => {
      setTypingUsers((prev) => {
        const users = new Set(prev[conversationId] || [])
        users.add(userId)
        return { ...prev, [conversationId]: users }
      })
    },
    onTypingStop: ({ userId, conversationId }) => {
      setTypingUsers((prev) => {
        const users = new Set(prev[conversationId] || [])
        users.delete(userId)
        return { ...prev, [conversationId]: users }
      })
    },
    onRecordingStart: ({ userId, conversationId }) => {
      setRecordingUsers((prev) => {
        const users = new Set(prev[conversationId] || [])
        users.add(userId)
        return { ...prev, [conversationId]: users }
      })
    },
    onRecordingStop: ({ userId, conversationId }) => {
      setRecordingUsers((prev) => {
        const users = new Set(prev[conversationId] || [])
        users.delete(userId)
        return { ...prev, [conversationId]: users }
      })
    },
    onPresenceUpdate: ({ userId, isOnline, lastSeenAt }) => {
      setUserPresences((prev) => ({
        ...prev,
        [userId]: { isOnline, lastSeenAt },
      }))
    },
    onConversationUpdated: () => {
      loadConversations()
    },
    onConversationCreated: ({ conversation }) => {
      setConversations((prev) => {
        if (prev.some((c) => c.id === conversation.id)) return prev
        return [conversation, ...prev]
      })
    },
  })

  // Set typing status triggers
  const handleTypingStatusChange = async (isTyping: boolean) => {
    if (!selectedConversation) return
    try {
      await fetch("/api/chat/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isTyping ? "typing_start" : "typing_stop",
          conversationId: selectedConversation.id,
        }),
      })
    } catch {}
  }

  const loadConversations = async () => {
    try {
      const res = await fetch("/api/chat/conversations")
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
      }
    } catch {}
  }

  // Load message logs when selected chat changes
  useEffect(() => {
    if (selectedConversation) {
      isInitialLoad.current = true
      loadMessages(selectedConversation.id, null)
      markModuleAsRead("chat")
    } else {
      setMessages([])
    }
  }, [selectedConversation])

  const loadMessages = async (convId: string, customCursor: string | null = null) => {
    if (loadingMessages) return
    setLoadingMessages(true)
    try {
      const cursorParam = customCursor ? `&cursor=${customCursor}` : ""
      const res = await fetch(`/api/chat/conversations/${convId}/messages?limit=50${cursorParam}`)
      if (res.ok) {
        const data = await res.json()
        if (customCursor) {
          // Prepend older messages
          setMessages((prev) => [...data.messages, ...prev])
        } else {
          setMessages(data.messages)
        }
        setHasMore(data.hasMore)
        setCursor(data.nextCursor)

        // Scroll to bottom on initial load
        if (isInitialLoad.current) {
          setTimeout(() => {
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
            }
          }, 100)
          isInitialLoad.current = false
        }
      }
    } catch (err) {
      console.error("Load messages error", err)
    } finally {
      setLoadingMessages(false)
    }
  }

  // Infinite scroll trigger
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0 && hasMore && cursor && !loadingMessages) {
      loadMessages(selectedConversation.id, cursor)
    }
  }

  // Mark message as read
  const markAsRead = async (messageId: string) => {
    try {
      await fetch(`/api/chat/messages/${messageId}/read`, { method: "POST" })
    } catch {}
  }

  // Messaging controls
  const handleSendText = async (text: string) => {
    if (!selectedConversation) return
    const body: any = { content: text, contentType: "text" }
    if (replyMessage) {
      body.replyToMessageId = replyMessage.id
      setReplyMessage(null)
    }

    try {
      const res = await fetch(`/api/chat/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const newMsg = await res.json()
        setMessages((prev) => [...prev, newMsg])
        loadConversations()
      }
    } catch {}
  }

  const handleSendFile = async (url: string, type: string, name: string, size: number) => {
    if (!selectedConversation) return
    try {
      const res = await fetch(`/api/chat/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: type,
          fileUrl: url,
          fileName: name,
          fileSize: size,
        }),
      })
      if (res.ok) {
        const newMsg = await res.json()
        setMessages((prev) => [...prev, newMsg])
        loadConversations()
      }
    } catch {}
  }

  const handleSendVoice = async (url: string, duration: number, waveform: number[], size: number) => {
    if (!selectedConversation) return
    try {
      const res = await fetch(`/api/chat/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: "voice",
          fileUrl: url,
          fileDuration: duration,
          waveformData: waveform,
          fileSize: size,
          voiceMessageData: { duration, waveform, fileSize: size },
        }),
      })
      if (res.ok) {
        const newMsg = await res.json()
        setMessages((prev) => [...prev, newMsg])
        loadConversations()
      }
    } catch {}
  }

  const handleSendLocation = async (lat: number, lng: number, name?: string, address?: string) => {
    if (!selectedConversation) return
    try {
      const res = await fetch(`/api/chat/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: "location",
          locationLat: lat,
          locationLng: lng,
          locationName: name,
          locationAddress: address,
        }),
      })
      if (res.ok) {
        const newMsg = await res.json()
        setMessages((prev) => [...prev, newMsg])
        loadConversations()
      }
    } catch {}
  }

  const handleSendPoll = async (poll: any) => {
    if (!selectedConversation) return
    try {
      const res = await fetch(`/api/chat/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: "poll",
          pollData: poll,
        }),
      })
      if (res.ok) {
        const newMsg = await res.json()
        setMessages((prev) => [...prev, newMsg])
        loadConversations()
      }
    } catch {}
  }

  // Message option actions
  const handleReact = async (messageId: string, emoji: string) => {
    try {
      await fetch(`/api/chat/messages/${messageId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      })
    } catch {}
  }

  const handleStar = async (messageId: string) => {
    try {
      const res = await fetch(`/api/chat/messages/${messageId}/star`, { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, isStarred: data.starred } : m))
        )
      }
    } catch {}
  }

  const handlePin = async (messageId: string) => {
    if (!selectedConversation) return
    try {
      await fetch(`/api/chat/conversations/${selectedConversation.id}/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      })
    } catch {}
  }

  const handleDelete = async (messageId: string, forAll: boolean) => {
    try {
      await fetch(`/api/chat/messages/${messageId}?forAll=${forAll}`, {
        method: "DELETE",
      })
    } catch {}
  }

  const handleEdit = async (messageId: string, newContent: string) => {
    try {
      await fetch(`/api/chat/messages/${messageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      })
    } catch {}
  }

  const handleVote = async (messageId: string, optionIds: string[]) => {
    try {
      await fetch(`/api/chat/messages/${messageId}/poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIds }),
      })
    } catch {}
  }

  // Sidebar Conversation Item Actions
  const handleMarkUnread = async (convId: string) => {
    try {
      const res = await fetch(`/api/chat/conversations/${convId}/unread`, { method: "POST" })
      if (res.ok) {
        loadConversations()
      }
    } catch {}
  }

  const handleArchive = async (convId: string) => {
    try {
      const res = await fetch(`/api/chat/conversations/${convId}?action=archive`, { method: "DELETE" })
      if (res.ok) {
        loadConversations()
        if (selectedConversation?.id === convId) {
          setSelectedConversation(null)
        }
      }
    } catch {}
  }

  const handleMute = async (convId: string, duration: string | null) => {
    try {
      const res = await fetch(`/api/chat/conversations/${convId}/mute`, {
        method: duration ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: duration ? JSON.stringify({ duration }) : undefined,
      })
      if (res.ok) {
        loadConversations()
      }
    } catch {}
  }

  // Navigation search jump
  const handleSelectRepliedMessage = (targetMessageId: string) => {
    const el = document.getElementById(`msg-${targetMessageId}`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      el.classList.add("bg-primary/10", "dark:bg-primary/20")
      setTimeout(() => {
        el.classList.remove("bg-primary/10", "dark:bg-primary/20")
      }, 2000)
    }
  }

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const matchesTab = c.type === activeTab
    const otherUser = c.participants?.find((p: any) => p.user.id !== session?.user.id)?.user
    const nameToSearch = c.type === "dm" ? otherUser?.fullName : c.name
    const matchesSearch = nameToSearch?.toLowerCase().includes(convSearchQuery.toLowerCase())
    return matchesTab && matchesSearch
  })

  // Direct DM Target presence status
  const getSelectedDmPresence = () => {
    if (!selectedConversation || selectedConversation.type !== "dm" || !session) return null
    const otherUser = selectedConversation.participants?.find(
      (p: any) => p.user.id !== session.user.id
    )?.user
    if (!otherUser) return null
    return userPresences[otherUser.id] || null
  }

  const selectedPresence = getSelectedDmPresence()

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[500px] overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121212] shadow-2xl relative">
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Panel */}
        <div className={`w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full overflow-hidden shrink-0 bg-white dark:bg-[#1a1a1a] ${selectedConversation ? "max-lg:hidden" : "max-lg:w-full"}`}>
          {/* Header Action Tools */}
          <div className="p-4 pb-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 select-none">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Sohbetler</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsStarredOpen(true)}
                title="Yıldızlı Mesajlar"
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5 text-gray-400 hover:text-amber-500 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">star</span>
              </button>
              <button
                onClick={() => setIsBlockedOpen(true)}
                title="Engellenenler"
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5 text-gray-400 hover:text-red-500 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">block</span>
              </button>
              <button
                onClick={() => setIsCreateOpen(true)}
                title="Yeni Sohbet Başlat"
                className="w-8 h-8 rounded-full bg-primary hover:bg-primary/95 text-white flex items-center justify-center shadow-md shadow-primary/10 transition-transform active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
            </div>
          </div>

          {/* Search box */}
          <div className="p-3 shrink-0">
            <div className="relative">
              <input
                type="text"
                placeholder="Sohbet arayın..."
                value={convSearchQuery}
                onChange={(e) => setConvSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/10 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs transition-all"
              />
              <span className="material-symbols-outlined text-gray-400 text-[16px] absolute left-3 top-2.5">
                search
              </span>
            </div>
          </div>

          {/* Tab filters */}
          <div className="flex px-3 pb-2 gap-1.5 overflow-x-auto shrink-0 select-none custom-scrollbar">
            {[
              { id: "dm", label: "Bireysel", icon: "person" },
              { id: "group", label: "Gruplar", icon: "group" },
              { id: "branch_channel", label: "Şubeler", icon: "domain" },
              { id: "broadcast", label: "Yayınlar", icon: "broadcast_on_personal" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any)
                  setSelectedConversation(null)
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 border transition-all ${
                  activeTab === tab.id
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-250 dark:border-gray-800 hover:bg-gray-100"
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Conversations scroll area */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-400 select-none">
                Sohbet bulunmuyor.
              </div>
            ) : (
              filteredConversations.map((c) => {
                const otherUser = c.participants?.find((p: any) => p.user.id !== session?.user.id)?.user
                const name = c.type === "dm" ? otherUser?.fullName : c.name
                const unread = c.unreadCount || 0
                const isSelected = selectedConversation?.id === c.id
                
                // Real-time statuses
                const typingSet = typingUsers[c.id]
                const recordingSet = recordingUsers[c.id]
                const isTypingNow = typingSet && typingSet.size > 0
                const isRecordingNow = recordingSet && recordingSet.size > 0

                return (
                  <div key={c.id} className="relative group w-full">
                    <button
                      onClick={() => setSelectedConversation(c)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all border text-left ${
                        isSelected
                          ? "bg-primary/5 dark:bg-primary/10 border-primary/20 shadow-xs"
                          : "hover:bg-gray-50 dark:hover:bg-white/5 border-transparent"
                      }`}
                    >
                      <div className="relative shrink-0 select-none">
                        <Avatar className="w-11 h-11 shadow-xs">
                          <AvatarImage src={c.type === "dm" ? otherUser?.avatarUrl : c.avatarUrl} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                            {name?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {/* DM Active presence dot */}
                        {c.type === "dm" && userPresences[otherUser?.id]?.isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#1a1a1a] bg-emerald-500 animate-pulse" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col gap-0.5 pr-6">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs truncate text-gray-900 dark:text-white flex items-center gap-1.5">
                            {name}
                            {c.isMuted && (
                              <span className="material-symbols-outlined text-[14px] text-gray-400 select-none">
                                volume_off
                              </span>
                            )}
                          </span>
                          {c.lastActivityAt && (
                            <span className="text-[9px] text-gray-400 select-none">
                              {new Date(c.lastActivityAt).toLocaleTimeString("tr-TR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>

                        {/* Display live typing / recording statuses or lastMessage */}
                        <div className="text-[11px] truncate flex items-center justify-between">
                          {isTypingNow ? (
                            <span className="text-emerald-500 font-semibold animate-pulse select-none">
                              Yazıyor...
                            </span>
                          ) : isRecordingNow ? (
                            <span className="text-emerald-500 font-semibold animate-pulse select-none">
                              Ses kaydediyor...
                            </span>
                          ) : (
                            <span className="text-gray-450 dark:text-gray-400">
                              {c.lastMessage?.isDeleted
                                ? "Bu mesaj silindi"
                                : c.lastMessage?.content || "Dosya eki"}
                            </span>
                          )}

                          {/* Unread count badge */}
                          {unread > 0 && (
                            <span className="bg-primary text-white text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 select-none">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Hover Options Button */}
                    <div className="absolute right-3 top-[50%] translate-y-[-50%] opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md flex items-center justify-center hover:scale-105 active:scale-95">
                            <span className="material-symbols-outlined text-[16px] text-gray-500">expand_more</span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl p-1 shadow-lg w-44">
                          <DropdownMenuItem onClick={() => handleMarkUnread(c.id)} className="rounded-lg gap-2 cursor-pointer py-2">
                            <span className="material-symbols-outlined text-[16px]">mark_chat_unread</span> Okunmadı İşaretle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArchive(c.id)} className="rounded-lg gap-2 cursor-pointer py-2">
                            <span className="material-symbols-outlined text-[16px]">archive</span> Arşivle
                          </DropdownMenuItem>
                          {c.isMuted ? (
                            <DropdownMenuItem onClick={() => handleMute(c.id, null)} className="rounded-lg gap-2 cursor-pointer py-2 text-red-500">
                              <span className="material-symbols-outlined text-[16px]">volume_up</span> Sesi Aç
                            </DropdownMenuItem>
                          ) : (
                            <>
                              <DropdownMenuItem onClick={() => handleMute(c.id, "8h")} className="rounded-lg gap-2 cursor-pointer py-2">
                                <span className="material-symbols-outlined text-[16px]">notifications_paused</span> 8 Saat Sessiz
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleMute(c.id, "1w")} className="rounded-lg gap-2 cursor-pointer py-2">
                                <span className="material-symbols-outlined text-[16px]">notifications_paused</span> 1 Hafta Sessiz
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleMute(c.id, "forever")} className="rounded-lg gap-2 cursor-pointer py-2">
                                <span className="material-symbols-outlined text-[16px]">volume_off</span> Kalıcı Sessiz
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Chat Box Container */}
        <div className={`flex-1 flex flex-col h-full bg-[#fafafa] dark:bg-[#0f0f0f] relative overflow-hidden ${!selectedConversation ? "max-lg:hidden" : ""}`}>
          {selectedConversation ? (
            <>
              {/* Header Box */}
              <div className="px-6 py-4 border-b border-gray-250/50 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] flex-shrink-0 flex items-center justify-between z-10 shadow-xs select-none">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="lg:hidden p-1 mr-1 text-gray-400 hover:text-foreground hover:bg-gray-100 rounded-lg flex items-center justify-center shrink-0"
                    title="Geri"
                  >
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                  </button>
                  <Avatar className="w-10 h-10">
                    <AvatarImage
                      src={
                        selectedConversation.type === "dm"
                          ? selectedConversation.participants?.find((p: any) => p.user.id !== session?.user.id)?.user.avatarUrl
                          : selectedConversation.avatarUrl
                      }
                    />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                      {(selectedConversation.type === "dm"
                        ? selectedConversation.participants?.find((p: any) => p.user.id !== session?.user.id)?.user.fullName
                        : selectedConversation.name
                      )
                        ?.slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <h2 className="text-xs font-bold text-gray-900 dark:text-white">
                      {selectedConversation.type === "dm"
                        ? selectedConversation.participants?.find((p: any) => p.user.id !== session?.user.id)?.user.fullName
                        : selectedConversation.name}
                    </h2>
                    <span className="text-[10px] text-gray-500 font-semibold mt-0.5 flex items-center gap-1">
                      {selectedConversation.type === "dm" ? (
                        selectedPresence?.isOnline ? (
                          <span className="text-emerald-500 flex items-center gap-1 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Online
                          </span>
                        ) : selectedPresence?.lastSeenAt ? (
                          `Son görülme: ${new Date(selectedPresence.lastSeenAt).toLocaleString("tr-TR")}`
                        ) : (
                          "Çevrimdışı"
                        )
                      ) : (
                        "Grup Konuşması"
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsImportOpen(true)}
                    title="Geçmişi İçe Aktar"
                    className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-gray-400"
                  >
                    <span className="material-symbols-outlined text-[22px]">upload_file</span>
                  </button>
                  <button
                    onClick={() => setIsDetailOpen(!isDetailOpen)}
                    title="Detayları Göster"
                    className={`w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                      isDetailOpen ? "text-primary" : "text-gray-400"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[22px]">info</span>
                  </button>
                </div>
              </div>

              {/* Message scroll container */}
              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-6 bg-[url('/images/chat-bg.png')] bg-opacity-5 scroll-smooth custom-scrollbar"
              >
                {loadingMessages && (
                  <div className="text-center py-4 text-xs text-gray-400 select-none">
                    Daha eski mesajlar yükleniyor...
                  </div>
                )}

                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400 select-none">
                    <span className="material-symbols-outlined text-5xl opacity-40 mb-2">forum</span>
                    <p className="text-xs font-semibold">Burada henüz mesaj yok.</p>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} id={`msg-${m.id}`}>
                      <MessageBubble
                        msg={m}
                        currentUserId={session?.user.id || ""}
                        onReact={(emoji) => handleReact(m.id, emoji)}
                        onReply={() => setReplyMessage(m)}
                        onForward={() => alert("İletme özelliği aktif.")}
                        onStar={() => handleStar(m.id)}
                        onPin={() => handlePin(m.id)}
                        onDelete={(forAll) => handleDelete(m.id, forAll)}
                        onEdit={(newVal) => handleEdit(m.id, newVal)}
                        onVote={(optIds) => handleVote(m.id, optIds)}
                        onSelectRepliedMessage={handleSelectRepliedMessage}
                      />
                    </div>
                  ))
                )}
              </div>

              {/* Input Area */}
              <MessageInputBar
                onSendText={handleSendText}
                onSendFile={handleSendFile}
                onSendVoice={handleSendVoice}
                onSendLocation={handleSendLocation}
                onSendPoll={handleSendPoll}
                replyMessage={replyMessage}
                onCancelReply={() => setReplyMessage(null)}
                isTyping={false}
                onTypingStatusChange={handleTypingStatusChange}
              />
            </>
          ) : (
            // No selection state
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[36px]">chat_bubble_outline</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">ERP WhatsApp Chat</h3>
              <p className="text-xs text-gray-500 max-w-xs mt-1 leading-relaxed">
                İletişime başlamak için soldan bir bireysel sohbet, grup veya şube kanalı seçin.
              </p>
            </div>
          )}
        </div>

        {/* Collapsible Details right panel */}
        {isDetailOpen && selectedConversation && session && (
          <DetailPanel
            conversation={selectedConversation}
            currentUserId={session.user.id}
            onClose={() => setIsDetailOpen(false)}
            onBlockChange={loadConversations}
            onConversationUpdated={loadConversations}
          />
        )}
      </div>

      {/* Helper Modals */}
      <CreateChatModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(conv) => {
          setConversations((prev) => [conv, ...prev])
          setSelectedConversation(conv)
        }}
        currentUserId={session?.user.id || ""}
        currentBranchId={currentBranch?.id}
      />

      <StarredMessagesModal
        isOpen={isStarredOpen}
        onClose={() => setIsStarredOpen(false)}
        currentUserId={session?.user.id || ""}
      />

      <BlockedListModal
        isOpen={isBlockedOpen}
        onClose={() => setIsBlockedOpen(false)}
        onUnblocked={loadConversations}
      />

      <ImportHistoryModal
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        conversationId={selectedConversation?.id || ""}
        conversationName={
          selectedConversation?.type === "dm"
            ? selectedConversation.participants?.find((p: any) => p.user.id !== session?.user.id)?.user.fullName
            : selectedConversation?.name
        }
      />
    </div>
  )
}
