import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { notificationEmitter } from "@/lib/services/notificationService"

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"

async function getUser() {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) return null

    try {
        const secret = new TextEncoder().encode(JWT_SECRET)
        const { payload } = await jwtVerify(token, secret)
        return payload
    } catch {
        return null
    }
}

export async function GET(req: Request) {
    const user = await getUser()
    if (!user) {
        return new Response("Unauthorized", { status: 401 })
    }

    const userId = user.id as string

    // Set headers for Server-Sent Events (SSE)
    const responseHeaders = new Headers({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "Content-Encoding": "none",
    })

    const stream = new ReadableStream({
        start(controller) {
            // Helper to send data down the stream
            const sendSSE = (event: string, data: any) => {
                try {
                    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
                    controller.enqueue(new TextEncoder().encode(message))
                } catch (e) {
                    console.error("Error enqueuing message:", e)
                }
            }

            // Send initial connection event
            sendSSE("connected", { status: "ready" })

            // Notification listener
            const onNotification = (notification: any) => {
                if (notification.userId === userId) {
                    sendSSE("notification", notification)
                }
            }

            // Register listener to the EventEmitter
            notificationEmitter.on("notification", onNotification)

            // Heartbeat/ping every 15 seconds to keep the connection alive
            const heartbeatInterval = setInterval(() => {
                try {
                    controller.enqueue(new TextEncoder().encode(":\n\n"))
                } catch {
                    // Fail silently, connection probably closed
                }
            }, 15000)

            // Handle client abort / connection close
            req.signal.addEventListener("abort", () => {
                notificationEmitter.off("notification", onNotification)
                clearInterval(heartbeatInterval)
                try {
                    controller.close()
                } catch {
                    // Fail silently
                }
            })
        },
        cancel() {
            // Clean up when stream is cancelled
        }
    })

    return new Response(stream, { headers: responseHeaders })
}
