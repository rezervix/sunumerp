import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface StarredMessagesModalProps {
  isOpen: boolean
  onClose: () => void
  currentUserId: string
}

export function StarredMessagesModal({
  isOpen,
  onClose,
  currentUserId,
}: StarredMessagesModalProps) {
  const [starredList, setStarredList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadStarredMessages()
    }
  }, [isOpen])

  const loadStarredMessages = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/chat/messages/star/star") // using the list endpoint
      if (res.ok) {
        const data = await res.json()
        setStarredList(data)
      }
    } catch (err) {
      console.error("Starred messages load error", err)
    } finally {
      setLoading(false)
    }
  }

  const handleUnstar = async (messageId: string) => {
    try {
      const res = await fetch(`/api/chat/messages/${messageId}/star`, {
        method: "POST", // toggle unstars it
      })
      if (res.ok) {
        setStarredList((prev) => prev.filter((item) => item.message.id !== messageId))
      }
    } catch (err) {
      console.error("Unstar error", err)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500 text-[24px]">star</span>
            Yıldızlı Mesajlar
          </DialogTitle>
        </DialogHeader>

        <div className="my-4 max-h-[300px] overflow-y-auto space-y-3 custom-scrollbar pr-1">
          {loading ? (
            <div className="text-center py-8 text-xs text-gray-400">Yükleniyor...</div>
          ) : starredList.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400 select-none flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-3xl opacity-60">star_rate</span>
              Yıldızlı mesaj bulunmuyor.
            </div>
          ) : (
            starredList.map((item) => {
              const msg = item.message
              const isImage = msg.contentType === "image"
              return (
                <div
                  key={item.id}
                  className="p-3 bg-gray-50 dark:bg-black/25 rounded-2xl border border-gray-200/50 dark:border-gray-850 flex flex-col gap-2 relative group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={msg.fromUser?.avatarUrl} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">
                          {msg.fromUser?.fullName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                        {msg.fromUser?.fullName}
                      </span>
                    </div>

                    <button
                      onClick={() => handleUnstar(msg.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold text-red-500 hover:underline"
                    >
                      Kaldır
                    </button>
                  </div>

                  <div className="text-xs text-gray-650 dark:text-gray-300 leading-relaxed whitespace-pre-wrap pl-8">
                    {isImage ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="material-symbols-outlined text-[16px]">image</span>
                        <span className="opacity-75">Fotoğraf</span>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>

                  <div className="text-[9px] text-gray-400 self-end mt-1 font-semibold">
                    {new Date(msg.createdAt).toLocaleString("tr-TR")}
                  </div>
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
