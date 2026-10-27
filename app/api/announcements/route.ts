import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload, requirePermission } from "@/lib/auth/server-permission"

export async function GET(req: Request) {
    const payload = await getAuthPayload()
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const announcements = await prisma.announcement.findMany({
            include: {
                createdBy: { select: { id: true, fullName: true, username: true } },
            },
            orderBy: { createdAt: "desc" },
        })
        return NextResponse.json(announcements)
    } catch (error) {
        console.error("Error fetching announcements:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get("branchId")

    const auth = await requirePermission("announcements", "write", branchId || undefined)
    if (auth instanceof NextResponse) return auth

    try {
        const body = await req.json()
        const { title, content, targetType, targetIds } = body

        if (!title || !content) {
            return NextResponse.json({ error: "Başlık ve içerik zorunludur" }, { status: 400 })
        }

        const announcement = await prisma.announcement.create({
            data: {
                title,
                content,
                targetType: targetType || "all",
                targetIds: targetIds ? JSON.stringify(targetIds) : null,
                createdById: auth.payload.userId,
            },
        })

        // Web Push Notification for the announcement
        try {
            const { sendPushNotification } = await import('@/lib/webpush');
            
            // Get all subscriptions except the sender
            const subs = await prisma.pushSubscription.findMany({
                where: { userId: { not: auth.payload.userId } }
            });
            
            const payload = JSON.stringify({
                title: `Yeni Duyuru: ${announcement.title}`,
                body: announcement.content.substring(0, 100) + (announcement.content.length > 100 ? "..." : ""),
                url: '/dashboard/announcements'
            });
            
            for (const sub of subs) {
                await sendPushNotification({
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth }
                }, payload);
            }
        } catch (pushErr) {
            console.error("Push notification error:", pushErr);
        }

        return NextResponse.json(announcement)
    } catch (error) {
        console.error("Error creating announcement:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get("branchId")

    const auth = await requirePermission("announcements", "write", branchId || undefined)
    if (auth instanceof NextResponse) return auth

    try {
        const body = await req.json()
        const { id, title, content, targetType, targetIds } = body
        if (!id) return NextResponse.json({ error: "ID zorunludur" }, { status: 400 })

        const announcement = await prisma.announcement.update({
            where: { id },
            data: { title, content, targetType, targetIds: targetIds ? JSON.stringify(targetIds) : undefined },
        })
        return NextResponse.json(announcement)
    } catch (error) {
        console.error("Error updating announcement:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get("branchId")

    const auth = await requirePermission("announcements", "write", branchId || undefined)
    if (auth instanceof NextResponse) return auth

    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID zorunludur" }, { status: 400 })

    try {
        await prisma.announcement.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting announcement:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

