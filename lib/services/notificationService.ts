import { EventEmitter } from "events"
import { prisma } from "@/lib/db"

// Create a global Event Emitter for real-time notification dispatching.
// In Next.js hot reloading, caching the emitter on the global object prevents creating multiple emitters.
const globalForEmitter = global as unknown as { notificationEmitter: EventEmitter }
export const notificationEmitter = globalForEmitter.notificationEmitter || new EventEmitter()
if (process.env.NODE_ENV !== "production") globalForEmitter.notificationEmitter = notificationEmitter

interface CreateNotificationInput {
    userId: string
    title: string
    message: string
    type?: string
    moduleType?: string
    content?: string
    link?: string
}

/**
 * Creates a notification in the database and broadcasts it in real-time.
 */
export async function createNotification(data: CreateNotificationInput) {
    try {
        const notification = await prisma.notification.create({
            data: {
                userId: data.userId,
                title: data.title,
                message: data.message,
                type: data.type || "info",
                moduleType: data.moduleType || null,
                content: data.content || null,
                link: data.link || null,
                isRead: false,
            }
        })

        // Broadcast to SSE clients
        notificationEmitter.emit("notification", notification)
        return notification
    } catch (error) {
        console.error("Error creating notification in service:", error)
        throw error
    }
}

/**
 * Creates multiple notifications in the database and broadcasts them in real-time.
 */
export async function createNotificationMany(dataList: CreateNotificationInput[]) {
    const notifications = []
    for (const item of dataList) {
        try {
            const notif = await createNotification(item)
            notifications.push(notif)
        } catch (error) {
            console.error("Error in createNotificationMany for item:", item, error)
        }
    }
    return notifications
}
