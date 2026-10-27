import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"

export async function POST(req: Request) {
    const auth = await getAuthPayload()
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const body = await req.json()
        const { endpoint, keys } = body.subscription

        await prisma.pushSubscription.upsert({
            where: { endpoint },
            update: {
                userId: auth.userId,
                p256dh: keys.p256dh,
                auth: keys.auth,
            },
            create: {
                userId: auth.userId,
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Subscription error", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
