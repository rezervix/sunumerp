"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Bell, CheckCheck, BellOff } from "lucide-react"
import { Button } from "@/components/ui/button"
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
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all"
          aria-label="Bildirimler"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] bg-rose-500 text-white border-2 border-slate-900 flex items-center justify-center rounded-full shadow-sm"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-80 max-w-[calc(100vw-2rem)] p-0 glass-panel rounded-2xl overflow-hidden text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bell size={15} className="text-primary" />
            <span className="font-semibold text-sm text-white">Bildirimler</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-white/10 text-white border-white/10">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAsRead()}
              className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
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
              <div className="size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <BellOff size={20} className="text-white/50" />
              </div>
              <p className="text-sm text-white/60">Henüz bildirim yok</p>
            </div>
          ) : (
            <div>
              {notifications.map((n, idx) => (
                <div key={n.id}>
                  {idx > 0 && <Separator className="bg-white/10" />}
                  <div
                    className={[
                      "px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer relative",
                      !n.isRead ? "bg-primary/10" : "",
                    ].join(" ")}
                    onClick={() => {
                      if (!n.isRead) markAsRead(n.id)
                      if (n.link) window.location.href = n.link
                      else setOpen(false)
                    }}
                    role="button"
                  >
                    {!n.isRead && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-primary" />
                    )}
                    <div className="pl-3">
                      <p className={`text-sm leading-snug ${!n.isRead ? "font-semibold text-white" : "text-white/75"}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-white/60 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-white/40 mt-1">
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
