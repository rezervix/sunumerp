import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface UserItem {
  id: string
  username: string
  fullName: string
  avatarUrl?: string
}

interface CreateChatModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (conversation: any) => void
  currentUserId: string
  currentBranchId?: string
}

export function CreateChatModal({
  isOpen,
  onClose,
  onCreated,
  currentUserId,
  currentBranchId,
}: CreateChatModalProps) {
  const [users, setUsers] = useState<UserItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"dm" | "group" | "broadcast">("dm")
  
  // Group & Broadcast state
  const [chatName, setChatName] = useState("")
  const [chatDescription, setChatDescription] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (isOpen) {
      loadUsers()
      // Reset state
      setSearchQuery("")
      setChatName("")
      setChatDescription("")
      setAvatarUrl("")
      setSelectedUserIds([])
      setError("")
    }
  }, [isOpen])

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/chat/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(data.filter((u: UserItem) => u.id !== currentUserId))
      }
    } catch (err) {
      console.error("Load users error", err)
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleToggleSelect = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  const handleCreateDM = async (targetUser: UserItem) => {
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "dm",
          participantIds: [targetUser.id],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        onCreated(data)
        onClose()
      } else {
        const errData = await res.json()
        setError(errData.error || "Sohbet oluşturulamadı.")
      }
    } catch (err) {
      setError("Bağlantı hatası.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateGroupOrBroadcast = async () => {
    if (!chatName.trim()) {
      setError("Grup/Liste adı zorunludur.")
      return
    }
    if (selectedUserIds.length === 0) {
      setError("En az bir katılımcı seçmelisiniz.")
      return
    }

    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeTab,
          name: chatName,
          description: chatDescription,
          avatarUrl,
          participantIds: selectedUserIds,
          branchId: currentBranchId,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        onCreated(data)
        onClose()
      } else {
        const errData = await res.json()
        setError(errData.error || "Oluşturma başarısız.")
      }
    } catch (err) {
      setError("Bağlantı hatası.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden p-0 gap-0 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
            Yeni Sohbet Başlat
          </DialogTitle>
        </DialogHeader>

        {/* Tab Selector */}
        <div className="flex px-6 pt-2 border-b border-gray-100 dark:border-gray-800 gap-4">
          <button
            onClick={() => setActiveTab("dm")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "dm"
                ? "border-primary text-primary"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            Bireysel Sohbet (DM)
          </button>
          <button
            onClick={() => setActiveTab("group")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "group"
                ? "border-primary text-primary"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            Grup Oluştur
          </button>
          <button
            onClick={() => setActiveTab("broadcast")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "broadcast"
                ? "border-primary text-primary"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            Yayın Listesi (Broadcast)
          </button>
        </div>

        {error && (
          <div className="px-6 py-3 bg-red-50 dark:bg-red-500/10 text-red-500 text-xs font-semibold border-b border-red-100 dark:border-red-900/20">
            {error}
          </div>
        )}

        {/* Tab Contents */}
        <div className="p-6 flex-1 flex flex-col min-h-[300px] max-h-[450px] overflow-hidden">
          {/* DM Tab */}
          {activeTab === "dm" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="İsim veya kullanıcı adı arayın..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
                />
                <span className="material-symbols-outlined text-gray-400 text-[18px] absolute left-3 top-3">
                  search
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-400">
                    Kullanıcı bulunamadı.
                  </div>
                ) : (
                  filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleCreateDM(u)}
                      disabled={submitting}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-left group"
                    >
                      <Avatar className="w-10 h-10 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                        <AvatarImage src={u.avatarUrl} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                          {u.fullName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-sm text-gray-900 dark:text-white">
                          {u.fullName}
                        </div>
                        <div className="text-xs text-gray-500">@{u.username}</div>
                      </div>
                      <span className="material-symbols-outlined text-gray-400 group-hover:text-primary transition-colors text-[20px] ml-auto">
                        chat_bubble
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Group & Broadcast Tab */}
          {(activeTab === "group" || activeTab === "broadcast") && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="space-y-3 mb-4">
                <input
                  type="text"
                  placeholder={
                    activeTab === "group" ? "Grup Adı" : "Yayın Listesi Adı"
                  }
                  value={chatName}
                  onChange={(e) => setChatName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
                />

                {activeTab === "group" && (
                  <>
                    <input
                      type="text"
                      placeholder="Grup Açıklaması (İsteğe bağlı)"
                      value={chatDescription}
                      onChange={(e) => setChatDescription(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
                    />
                    <input
                      type="text"
                      placeholder="Avatar URL'i (İsteğe bağlı)"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
                    />
                  </>
                )}
              </div>

              <div className="relative mb-3 shrink-0">
                <input
                  type="text"
                  placeholder="Kullanıcı davet et..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
                />
                <span className="material-symbols-outlined text-gray-400 text-[18px] absolute left-3 top-3">
                  search
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                {filteredUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id)
                  return (
                    <button
                      key={u.id}
                      onClick={() => handleToggleSelect(u.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-2xl transition-all text-left ${
                        isSelected
                          ? "bg-primary/5 dark:bg-primary/10 border border-primary/20"
                          : "hover:bg-gray-50 dark:hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={u.avatarUrl} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                          {u.fullName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate text-gray-900 dark:text-white">
                          {u.fullName}
                        </div>
                        <div className="text-[11px] text-gray-500">@{u.username}</div>
                      </div>
                      <div className="shrink-0 flex items-center justify-center">
                        <span
                          className={`material-symbols-outlined text-[22px] transition-all ${
                            isSelected
                              ? "text-primary"
                              : "text-gray-300 dark:text-gray-700"
                          }`}
                        >
                          {isSelected ? "check_circle" : "radio_button_unchecked"}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 shrink-0">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  İptal
                </button>
                <button
                  onClick={handleCreateGroupOrBroadcast}
                  disabled={submitting || selectedUserIds.length === 0}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/95 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary/20"
                >
                  {submitting ? "Oluşturuluyor..." : "Oluştur"}
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
