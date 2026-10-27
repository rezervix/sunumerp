"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/lib/auth/context"

export interface Notification {
    id: string
    title: string
    message: string
    type: string
    moduleType?: string | null
    content?: string | null
    isRead: boolean
    link?: string | null
    createdAt: string
}

interface NotificationContextType {
    unreadCounts: Record<string, number>
    notifications: Notification[]
    markAsRead: (id: string) => Promise<void>
    markAllAsRead: () => Promise<void>
    markModuleAsRead: (moduleType: string) => Promise<void>
    refresh: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { session } = useAuth()
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
    const [notifications, setNotifications] = useState<Notification[]>([])
    const eventSourceRef = useRef<EventSource | null>(null)

    // Detect environment
    const isElectron = typeof window !== "undefined" && !!((window as any).process?.versions?.electron)
    const isWebView = typeof window !== "undefined" && (
        !!(window as any).ReactNativeWebView?.postMessage ||
        !!(window as any).webkit?.messageHandlers?.notificationHandler ||
        !!(window as any).AndroidBridge?.showNotification ||
        typeof (window as any).onWebViewNotification === "function"
    )

    // Play notification sound
    const playNotificationSound = useCallback(() => {
        try {
            const audio = new Audio("/sounds/notification.mp3")
            audio.volume = 0.5
            audio.play().catch(() => {
                // Ignore autoplay block errors
            })
        } catch {
            // Ignore errors
        }
    }, [])

    // Expose notifications across platforms
    const triggerSystemNotification = useCallback((notif: Notification) => {
        const title = notif.title || "Yeni Bildirim"
        const message = notif.message || ""

        // 1. Electron Native OS Notification
        if (isElectron) {
            try {
                const electron = (window as any).require ? (window as any).require("electron") : null
                if (electron?.ipcRenderer) {
                    electron.ipcRenderer.send("show-notification", { title, body: message })
                    playNotificationSound()
                    return
                }
            } catch (err) {
                console.error("Electron notification failed", err)
            }
        }

        // 2. WebView Callback for Native Apps
        if (isWebView) {
            try {
                const payload = JSON.stringify({
                    type: "notification",
                    id: notif.id,
                    title,
                    message,
                    moduleType: notif.moduleType,
                    link: notif.link
                })

                if ((window as any).ReactNativeWebView?.postMessage) {
                    (window as any).ReactNativeWebView.postMessage(payload)
                } else if ((window as any).webkit?.messageHandlers?.notificationHandler) {
                    (window as any).webkit.messageHandlers.notificationHandler.postMessage(notif)
                } else if ((window as any).AndroidBridge?.showNotification) {
                    (window as any).AndroidBridge.showNotification(title, message, notif.link || "")
                }
                
                if (typeof (window as any).onWebViewNotification === "function") {
                    (window as any).onWebViewNotification(notif)
                }
                
                playNotificationSound()
                return
            } catch (err) {
                console.error("WebView notification failed", err)
            }
        }

        // 3. Web Notification API (Web browser)
        if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "granted") {
                new Notification(title, { body: message })
                playNotificationSound()
            } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") {
                        new Notification(title, { body: message })
                        playNotificationSound()
                    }
                })
            }
        }
    }, [isElectron, isWebView, playNotificationSound])

    // Load unread notification counts and latest notifications list
    const loadCounts = useCallback(async () => {
        if (!session?.user) return
        try {
            const res = await fetch("/api/notifications/counts")
            if (res.ok) {
                const data = await res.json()
                setUnreadCounts(data || {})
            }
        } catch (error) {
            console.error("Error loading notification counts:", error)
        }
    }, [session])

    const loadNotificationsList = useCallback(async () => {
        if (!session?.user) return
        try {
            const res = await fetch("/api/notifications")
            if (res.ok) {
                const data = await res.json()
                setNotifications(Array.isArray(data) ? data : [])
            }
        } catch (error) {
            console.error("Error loading notifications list:", error)
        }
    }, [session])

    const refresh = useCallback(async () => {
        await Promise.all([loadCounts(), loadNotificationsList()])
    }, [loadCounts, loadNotificationsList])

    // Mark single notification as read
    const markAsRead = useCallback(async (id: string) => {
        try {
            const res = await fetch("/api/notifications", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            })
            if (res.ok) {
                // Optimistically update lists and counts
                setNotifications(prev =>
                    prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
                )
                const targetNotif = notifications.find(n => n.id === id)
                if (targetNotif && targetNotif.moduleType) {
                    setUnreadCounts(prev => {
                        const count = prev[targetNotif.moduleType!] || 0
                        return {
                            ...prev,
                            [targetNotif.moduleType!]: Math.max(0, count - 1),
                        }
                    })
                }
            }
        } catch (error) {
            console.error("Error marking notification as read:", error)
        }
    }, [notifications])

    // Mark all notifications as read
    const markAllAsRead = useCallback(async () => {
        try {
            const res = await fetch("/api/notifications", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ all: true }),
            })
            if (res.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
                setUnreadCounts({})
            }
        } catch (error) {
            console.error("Error marking all notifications as read:", error)
        }
    }, [])

    // Mark specific module notifications as read (e.g. Chat read event)
    const markModuleAsRead = useCallback(async (moduleType: string) => {
        try {
            const res = await fetch("/api/notifications", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ moduleType }),
            })
            if (res.ok) {
                setNotifications(prev =>
                    prev.map(n => (n.moduleType === moduleType ? { ...n, isRead: true } : n))
                )
                setUnreadCounts(prev => ({
                    ...prev,
                    [moduleType]: 0,
                }))
            }
        } catch (error) {
            console.error(`Error marking module ${moduleType} notifications as read:`, error)
        }
    }, [])

    // Set up SSE Stream Connection
    useEffect(() => {
        if (!session?.user) {
            if (eventSourceRef.current) {
                eventSourceRef.current.close()
                eventSourceRef.current = null
            }
            setUnreadCounts({})
            setNotifications([])
            return
        }

        // Request browser notifications permission on mount
        if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "default") {
                Notification.requestPermission()
            }
        }

        // Fetch initial state
        refresh()

        // Connect to SSE stream
        const eventSource = new EventSource("/api/notifications/stream")
        eventSourceRef.current = eventSource

        eventSource.addEventListener("notification", (e: MessageEvent) => {
            try {
                const newNotif = JSON.parse(e.data) as Notification
                
                // Add to notifications list
                setNotifications(prev => [newNotif, ...prev.slice(0, 19)])
                
                // Increment unread count for module
                if (newNotif.moduleType) {
                    setUnreadCounts(prev => ({
                        ...prev,
                        [newNotif.moduleType!]: (prev[newNotif.moduleType!] || 0) + 1,
                    }))
                }

                // Show native notification
                triggerSystemNotification(newNotif)
            } catch (err) {
                console.error("Error parsing real-time notification:", err)
            }
        })

        eventSource.onerror = (e) => {
            console.warn("SSE connection error, closing event source. Retrying in 10s...", e)
            eventSource.close()
            
            // Failover: Try reconnecting after 10s
            setTimeout(() => {
                if (session?.user && !eventSourceRef.current) {
                    // Reconnect
                    refresh()
                }
            }, 10000)
        }

        return () => {
            if (eventSource) {
                eventSource.close()
            }
            if (eventSourceRef.current === eventSource) {
                eventSourceRef.current = null
            }
        }
    }, [session, refresh, triggerSystemNotification])

    return (
        <NotificationContext.Provider
            value={{
                unreadCounts,
                notifications,
                markAsRead,
                markAllAsRead,
                markModuleAsRead,
                refresh,
            }}
        >
            {children}
        </NotificationContext.Provider>
    )
}

export function useNotificationStore() {
    const context = useContext(NotificationContext)
    if (context === undefined) {
        throw new Error("useNotificationStore must be used within a NotificationProvider")
    }
    return context
}
