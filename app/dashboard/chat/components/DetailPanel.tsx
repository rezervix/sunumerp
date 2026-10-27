import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DetailPanelProps {
  conversation: any
  currentUserId: string
  onClose: () => void
  onBlockChange?: () => void
  onConversationUpdated?: () => void
}

export function DetailPanel({
  conversation,
  currentUserId,
  onClose,
  onBlockChange,
  onConversationUpdated,
}: DetailPanelProps) {
  const [participants, setParticipants] = useState<any[]>([])
  const [inviteData, setInviteData] = useState<any>(null)
  const [isBlocked, setIsBlocked] = useState(false)
  const [muteSettings, setMuteSettings] = useState<any>(null)
  const [wallpaperColor, setWallpaperColor] = useState("#ffffff")
  
  // Modals state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [addSearchQuery, setAddSearchQuery] = useState("")
  const [usersToAdd, setUsersToAdd] = useState<any[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Direct Messaging target user
  const otherParticipant =
    conversation.type === "dm"
      ? conversation.participants?.find((p: any) => p.user.id !== currentUserId)
      : null
  const targetUser = otherParticipant?.user

  useEffect(() => {
    loadParticipants()
    if (conversation.type !== "dm") {
      loadInviteLink()
    } else if (targetUser) {
      checkBlockStatus()
    }
    loadMuteStatus()
  }, [conversation.id])

  const loadParticipants = async () => {
    try {
      const res = await fetch(`/api/chat/conversations/${conversation.id}/participants`)
      if (res.ok) {
        const data = await res.json()
        setParticipants(data)
      }
    } catch (err) {
      console.error("Load participants error", err)
    }
  }

  const loadInviteLink = async () => {
    try {
      const res = await fetch(`/api/chat/conversations/${conversation.id}/invite`)
      if (res.ok) {
        const data = await res.json()
        setInviteData(data)
      }
    } catch (err) {
      console.error("Load invite error", err)
    }
  }

  const resetInviteLink = async () => {
    try {
      const res = await fetch(`/api/chat/conversations/${conversation.id}/invite`, {
        method: "POST",
      })
      if (res.ok) {
        const data = await res.json()
        setInviteData(data)
      }
    } catch (err) {
      console.error("Reset invite link error", err)
    }
  }

  const checkBlockStatus = async () => {
    try {
      const res = await fetch("/api/chat/block")
      if (res.ok) {
        const data = await res.json()
        const blocked = data.some((b: any) => b.blockedId === targetUser.id)
        setIsBlocked(blocked)
      }
    } catch (err) {
      console.error("Check block status error", err)
    }
  }

  const handleBlockToggle = async () => {
    if (!targetUser) return
    const method = isBlocked ? "DELETE" : "POST"
    const url = isBlocked ? `/api/chat/block?userId=${targetUser.id}` : "/api/chat/block"
    const body = isBlocked ? undefined : JSON.stringify({ userId: targetUser.id })

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      })

      if (res.ok) {
        setIsBlocked(!isBlocked)
        onBlockChange?.()
      }
    } catch (err) {
      console.error("Block action failed", err)
    }
  }

  const loadMuteStatus = async () => {
    // Just a placeholder implementation or fetches from settings list
  }

  const handleMuteToggle = async (duration: string | null) => {
    const url = `/api/chat/conversations/${conversation.id}/mute`
    try {
      const res = await fetch(url, {
        method: duration ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: duration ? JSON.stringify({ duration }) : undefined,
      })

      if (res.ok) {
        onConversationUpdated?.()
      }
    } catch (err) {
      console.error("Mute failed", err)
    }
  }

  // Admin participants tools
  const myParticipant = conversation.participants?.find((p: any) => p.user.id === currentUserId)
  const isMeAdmin = myParticipant?.role === "admin" || myParticipant?.role === "super_admin"

  const handleKickParticipant = async (userId: string) => {
    if (!window.confirm("Bu üyeyi gruptan çıkarmak istediğinize emin misiniz?")) return
    try {
      const res = await fetch(`/api/chat/conversations/${conversation.id}/participants?userId=${userId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        loadParticipants()
        onConversationUpdated?.()
      }
    } catch (err) {
      console.error("Kick participant failed", err)
    }
  }

  const handleChangeRole = async (userId: string, targetRole: string) => {
    try {
      const res = await fetch(`/api/chat/conversations/${conversation.id}/participants`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: targetRole }),
      })

      if (res.ok) {
        loadParticipants()
      }
    } catch (err) {
      console.error("Change role error", err)
    }
  }

  // Add Member Modal handlers
  const openAddMember = async () => {
    setIsAddMemberOpen(true)
    setSelectedUserIds([])
    setAddSearchQuery("")
    try {
      const res = await fetch("/api/chat/users")
      if (res.ok) {
        const allUsers = await res.json()
        const existingIds = new Set(participants.map((p) => p.userId))
        setUsersToAdd(allUsers.filter((u: any) => !existingIds.has(u.id) && u.id !== currentUserId))
      }
    } catch (err) {
      console.error("Fetch add members err", err)
    }
  }

  const handleAddMembersSubmit = async () => {
    if (selectedUserIds.length === 0) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/chat/conversations/${conversation.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: selectedUserIds }),
      })

      if (res.ok) {
        setIsAddMemberOpen(false)
        loadParticipants()
        onConversationUpdated?.()
      }
    } catch (err) {
      console.error("Add members failed", err)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredAddUsers = usersToAdd.filter(
    (u) =>
      u.fullName.toLowerCase().includes(addSearchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(addSearchQuery.toLowerCase())
  )

  const handleToggleAddSelect = (uid: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    )
  }

  return (
    <div className="w-80 bg-white dark:bg-[#1a1a1a] border-l border-gray-200 dark:border-gray-800 flex flex-col h-full overflow-hidden shrink-0 animate-in slide-in-from-right-4 duration-200">
      {/* Panel Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 select-none">
        <h3 className="font-bold text-gray-900 dark:text-white">Detaylar</h3>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5 text-gray-400"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {/* Profile Card */}
        <div className="flex flex-col items-center text-center">
          <Avatar className="w-20 h-20 shadow-md mb-3">
            <AvatarImage src={conversation.type === "dm" ? targetUser?.avatarUrl : conversation.avatarUrl} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
              {(conversation.type === "dm"
                ? targetUser?.fullName
                : conversation.name
              )
                ?.slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h4 className="font-bold text-gray-900 dark:text-white text-base">
            {conversation.type === "dm" ? targetUser?.fullName : conversation.name}
          </h4>
          <span className="text-xs text-gray-500 mt-0.5">
            {conversation.type === "dm" ? `@${targetUser?.username}` : `${participants.length} Katılımcı`}
          </span>
        </div>

        {/* Group Description */}
        {conversation.type !== "dm" && conversation.description && (
          <div className="space-y-1 bg-gray-50 dark:bg-black/10 p-3 rounded-2xl">
            <span className="text-[10px] font-bold text-gray-400 select-none uppercase tracking-wide">
              Grup Açıklaması
            </span>
            <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
              {conversation.description}
            </p>
          </div>
        )}

        {/* Mute Settings */}
        <div className="space-y-2 bg-gray-50 dark:bg-black/10 p-3 rounded-2xl">
          <span className="text-[10px] font-bold text-gray-400 select-none uppercase tracking-wide">
            Sessize Al
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleMuteToggle("8h")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-800 hover:bg-gray-100"
            >
              8 Saat
            </button>
            <button
              onClick={() => handleMuteToggle("1w")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-800 hover:bg-gray-100"
            >
              1 Hafta
            </button>
            <button
              onClick={() => handleMuteToggle("forever")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-800 hover:bg-gray-100"
            >
              Kalıcı
            </button>
            <button
              onClick={() => handleMuteToggle(null)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100"
            >
              Sesi Aç
            </button>
          </div>
        </div>

        {/* Invite Link Controls */}
        {conversation.type !== "dm" && inviteData && (
          <div className="space-y-2 bg-gray-50 dark:bg-black/10 p-3 rounded-2xl">
            <span className="text-[10px] font-bold text-gray-400 select-none uppercase tracking-wide">
              Grup Davet Linki
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteData.fullUrl}
                className="flex-1 bg-white dark:bg-black/20 text-[10px] p-2 rounded-lg border border-gray-250 dark:border-gray-750 focus:outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteData.fullUrl)
                  alert("Davet linki panoya kopyalandı.")
                }}
                className="p-2 bg-primary text-white rounded-lg hover:bg-primary/95 flex items-center justify-center shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span>
              </button>
            </div>
            {isMeAdmin && (
              <button
                onClick={resetInviteLink}
                className="text-[10px] font-bold text-primary hover:underline"
              >
                Linki Sıfırla
              </button>
            )}
          </div>
        )}

        {/* DM Actions */}
        {conversation.type === "dm" && targetUser && (
          <div className="space-y-3">
            <button
              onClick={handleBlockToggle}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
                isBlocked
                  ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-100"
                  : "bg-white dark:bg-white/5 border-gray-250 dark:border-gray-750 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/5"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">block</span>
              {isBlocked ? "Engeli Kaldır" : "Kullanıcıyı Engelle"}
            </button>
          </div>
        )}

        {/* Participants List */}
        {conversation.type !== "dm" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between select-none">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                Katılımcılar ({participants.length})
              </span>
              {isMeAdmin && (
                <button
                  onClick={openAddMember}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[16px]">person_add</span> Ekle
                </button>
              )}
            </div>

            <div className="space-y-2">
              {participants.map((p) => {
                const isTargetAdmin = p.role === "admin" || p.role === "super_admin"
                const isCurrentUser = p.user.id === currentUserId
                
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={p.user.avatarUrl} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                          {p.user.fullName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex flex-col">
                        <span className="text-xs font-semibold truncate text-gray-900 dark:text-white">
                          {p.user.fullName} {isCurrentUser && "(Sen)"}
                        </span>
                        {isTargetAdmin && (
                          <span className="text-[9px] font-bold text-primary dark:text-primary-foreground select-none uppercase tracking-wide mt-0.5">
                            Yönetici
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Admin Actions */}
                    {isMeAdmin && !isCurrentUser && (
                      <div className="flex items-center gap-1">
                        {p.role === "member" ? (
                          <button
                            onClick={() => handleChangeRole(p.user.id, "admin")}
                            title="Yönetici Yap"
                            className="p-1 hover:bg-primary/10 text-primary rounded-lg"
                          >
                            <span className="material-symbols-outlined text-[16px]">shield</span>
                          </button>
                        ) : (
                          p.role !== "super_admin" && (
                            <button
                              onClick={() => handleChangeRole(p.user.id, "member")}
                              title="Yöneticiliği Kaldır"
                              className="p-1 hover:bg-red-500/10 text-red-500 rounded-lg"
                            >
                              <span className="material-symbols-outlined text-[16px]">shield_person</span>
                            </button>
                          )
                        )}

                        {p.role !== "super_admin" && (
                          <button
                            onClick={() => handleKickParticipant(p.user.id)}
                            title="Gruptan Çıkar"
                            className="p-1 hover:bg-red-500/10 text-red-500 rounded-lg"
                          >
                            <span className="material-symbols-outlined text-[16px]">logout</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Member Modal Dialog */}
      <Dialog open={isAddMemberOpen} onOpenChange={() => setIsAddMemberOpen(false)}>
        <DialogContent className="max-w-md bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Gruba Üye Ekle</DialogTitle>
          </DialogHeader>

          <div className="relative my-3">
            <input
              type="text"
              placeholder="İsim veya kullanıcı adı arayın..."
              value={addSearchQuery}
              onChange={(e) => setAddSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
            />
            <span className="material-symbols-outlined text-gray-400 text-[18px] absolute left-3 top-3">
              search
            </span>
          </div>

          <div className="max-h-[220px] overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
            {filteredAddUsers.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400">Kullanıcı bulunamadı.</div>
            ) : (
              filteredAddUsers.map((u) => {
                const isSelected = selectedUserIds.includes(u.id)
                return (
                  <button
                    key={u.id}
                    onClick={() => handleToggleAddSelect(u.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-2xl transition-all text-left ${
                      isSelected
                        ? "bg-primary/5 dark:bg-primary/10 border border-primary/20"
                        : "hover:bg-gray-50 dark:hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <Avatar className="w-8.5 h-8.5">
                      <AvatarImage src={u.avatarUrl} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                        {u.fullName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs truncate text-gray-900 dark:text-white">
                        {u.fullName}
                      </div>
                      <div className="text-[10px] text-gray-400">@{u.username}</div>
                    </div>
                    <span
                      className={`material-symbols-outlined text-[20px] ${
                        isSelected ? "text-primary" : "text-gray-300 dark:text-gray-700"
                      }`}
                    >
                      {isSelected ? "check_circle" : "radio_button_unchecked"}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          <div className="mt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800 pt-3">
            <button
              onClick={() => setIsAddMemberOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              İptal
            </button>
            <button
              onClick={handleAddMembersSubmit}
              disabled={submitting || selectedUserIds.length === 0}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {submitting ? "Ekleniyor..." : "Gruba Ekle"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
