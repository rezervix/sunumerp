"use client"

import { useState, useEffect } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { LogisticsNotificationPrefsPanel } from "@/components/shared/logistics-notification-prefs-panel"
import { IconBell, IconCheck, IconSettings } from "@/components/ui/app-icons"
import { safeDate, safeText } from "@/lib/utils/safe-display"

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
  const [activeView, setActiveView] = useState<"list" | "prefs">("list")

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
        setNotifications((prev) =>
          prev.map((n) =>
            id ? (n.id === id ? { ...n, isRead: true } : n) : { ...n, isRead: true }
          )
        )
      }
    } catch {
      // silent
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative size-9 rounded-full bg-transparent hover:bg-[var(--brand-soft)] text-[var(--text-2)] hover:text-[var(--brand)] flex items-center justify-center transition-colors duration-150 cursor-pointer"
          aria-label="Bildirimler"
        >
          <IconBell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[var(--brand)] ring-2 ring-white" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 max-w-[calc(100vw-2rem)] p-0 rounded-[20px] overflow-hidden bg-[var(--bg)] text-[var(--text)] border border-[var(--line)] shadow-[var(--shadow-card)]"
      >
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--page)]/70 border-b border-[var(--line-soft)]">
          <div className="flex items-center gap-2">
            <IconBell size={14} className="text-[var(--brand)]" />
            <span className="font-semibold text-xs text-[var(--text)]">
              {activeView === "prefs" ? "Bildirim Tercihleri" : "Bildirimler"}
            </span>
            {activeView === "list" && unreadCount > 0 && (
              <Badge variant="brand" className="text-[10px] h-4 px-1.5">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeView === "list" && unreadCount > 0 && (
              <button
                onClick={() => markAsRead()}
                className="flex items-center gap-1 text-xs text-[var(--brand)] hover:underline font-medium cursor-pointer"
              >
                <IconCheck size={13} />
                Tümünü oku
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveView(activeView === "list" ? "prefs" : "list")}
              title={activeView === "list" ? "Bildirim Tercihleri" : "Bildirim Listesine Dön"}
              aria-label={activeView === "list" ? "Bildirim Tercihleri" : "Bildirim Listesine Dön"}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                activeView === "prefs"
                  ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--muted-bg)]"
              }`}
            >
              <IconSettings size={14} />
            </button>
          </div>
        </div>

        <ScrollArea className="max-h-[400px]">
          {activeView === "prefs" ? (
            <LogisticsNotificationPrefsPanel
              compact
              onNotificationsRefreshed={loadNotifications}
            />
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <div className="size-9 rounded-full bg-[var(--muted-bg)] flex items-center justify-center text-[var(--text-muted)]">
                <IconBell size={16} />
              </div>
              <p className="text-xs text-[var(--text-muted)]">Henüz yeni bildirim yok</p>
            </div>
          ) : (
            <div>
              {notifications.map((n, idx) => (
                <div key={n.id}>
                  {idx > 0 && <Separator />}
                  <div
                    className={[
                      "px-4 py-3 hover:bg-[var(--page)] transition-colors cursor-pointer relative",
                      !n.isRead ? "bg-[var(--brand-soft)]/55" : "bg-[var(--bg)]",
                    ].join(" ")}
                    onClick={() => {
                      if (!n.isRead) markAsRead(n.id)
                      if (n.link) window.location.href = n.link
                      else setOpen(false)
                    }}
                    role="button"
                  >
                    {!n.isRead && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-[var(--brand)]" />
                    )}
                    <div className="pl-2.5">
                      <p
                        className={`text-xs leading-snug ${
                          !n.isRead
                            ? "font-semibold text-[var(--text)]"
                            : "text-[var(--text-2)]"
                        }`}
                      >
                        {safeText(n.title, "Bildirim")}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2">
                        {safeText(n.message, "")}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">
                        {safeDate(n.createdAt, true)}
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
