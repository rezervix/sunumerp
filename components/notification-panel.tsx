"use client"

import { useState, useEffect } from "react"
import { Bell, CheckCheck, BellOff } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

interface Notification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  link?: string
  createdAt: string
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadNotifications = async () => {
    try {
      const res = await fetch("/api/notifications")
      if (res.ok) {
        const data = await res.json()
        setNotifications(Array.isArray(data) ? data : [])
      }
    } catch {
      // silent
    }
  }

  const markAsRead = async (id?: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id } : { all: true }),
      })
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (id ? (n.id === id ? { ...n, isRead: true } : n) : { ...n, isRead: true }))
        )
      }
    } catch {
      // silent
    }
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative size-8 rounded-full bg-transparent hover:bg-white/[0.06] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Bildirimler"
        >
          <Bell size={17} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 size-2 rounded-full bg-emerald-400 ring-2 ring-[#111513]" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-80 max-w-[calc(100vw-2rem)] p-0 glass-panel rounded-[20px] overflow-hidden text-white border-white/[0.06]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-emerald-400" />
            <span className="font-medium text-xs text-white">Bildirimler</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-emerald-500/10 text-emerald-400 border-0">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAsRead()}
              className="flex items-center gap-1 text-xs text-emerald-400 hover:underline font-medium cursor-pointer"
            >
              <CheckCheck size={13} />
              Tümünü oku
            </button>
          )}
        </div>

        {/* List */}
        <ScrollArea className="max-h-[380px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="size-10 rounded-full bg-white/[0.04] flex items-center justify-center">
                <BellOff size={18} className="text-zinc-500" />
              </div>
              <p className="text-xs text-zinc-500">Henüz bildirim yok</p>
            </div>
          ) : (
            <div>
              {notifications.map((n, idx) => (
                <div key={n.id}>
                  {idx > 0 && <Separator className="bg-white/[0.06]" />}
                  <div
                    className={[
                      "px-4 py-3 hover:bg-white/[0.04] transition-colors cursor-pointer relative",
                      !n.isRead ? "bg-emerald-500/[0.05]" : "",
                    ].join(" ")}
                    onClick={() => {
                      if (!n.isRead) markAsRead(n.id)
                      if (n.link) window.location.href = n.link
                      else setOpen(false)
                    }}
                    role="button"
                  >
                    {!n.isRead && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-emerald-400" />
                    )}
                    <div className="pl-3">
                      <p className={`text-xs leading-snug ${!n.isRead ? "font-medium text-white" : "text-zinc-300"}`}>
                        {n.title}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-zinc-500 mt-1 tabular-nums">
                        {new Date(n.createdAt).toLocaleString("tr-TR")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
