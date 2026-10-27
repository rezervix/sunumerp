import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface BlockedListModalProps {
  isOpen: boolean
  onClose: () => void
  onUnblocked?: () => void
}

export function BlockedListModal({
  isOpen,
  onClose,
  onUnblocked,
}: BlockedListModalProps) {
  const [blockedUsers, setBlockedUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadBlockedUsers()
    }
  }, [isOpen])

  const loadBlockedUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/chat/block")
      if (res.ok) {
        const data = await res.json()
        setBlockedUsers(data)
      }
    } catch (err) {
      console.error("Blocked users load error", err)
    } finally {
      setLoading(false)
    }
  }

  const handleUnblock = async (userId: string) => {
    try {
      const res = await fetch(`/api/chat/block?userId=${userId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setBlockedUsers((prev) => prev.filter((item) => item.blocked.id !== userId))
        onUnblocked?.()
      }
    } catch (err) {
      console.error("Unblock action failed", err)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500 text-[24px]">block</span>
            Engellenen Kişiler
          </DialogTitle>
        </DialogHeader>

        <div className="my-4 max-h-[300px] overflow-y-auto space-y-2 custom-scrollbar pr-1">
          {loading ? (
            <div className="text-center py-8 text-xs text-gray-400">Yükleniyor...</div>
          ) : blockedUsers.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400 select-none flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-3xl opacity-60">person_off</span>
              Engellenen kimse bulunmuyor.
            </div>
          ) : (
            blockedUsers.map((item) => {
              const u = item.blocked
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-black/25 rounded-2xl border border-gray-200/50 dark:border-gray-850"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={u.avatarUrl} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                        {u.fullName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-xs text-gray-900 dark:text-white">
                        {u.fullName}
                      </div>
                      <div className="text-[10px] text-gray-500">@{u.username}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleUnblock(u.id)}
                    className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-500/10 text-xs font-semibold"
                  >
                    Engeli Kaldır
                  </button>
                </div>
              )
            })
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Kapat
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
