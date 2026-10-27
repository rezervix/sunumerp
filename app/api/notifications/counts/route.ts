import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"

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
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const userId = user.id as string
        
        // Fetch unread notification counts grouped by moduleType
        const counts = await prisma.notification.groupBy({
            by: ['moduleType'],
            where: {
                userId,
                isRead: false,
                moduleType: { not: null }
            },
            _count: {
                id: true
            }
        })

        // Transform results into a simple mapping: { [moduleType]: count }
        const formattedCounts: Record<string, number> = {}
        for (const c of counts) {
            if (c.moduleType) {
                formattedCounts[c.moduleType] = c._count.id
            }
        }

        return NextResponse.json(formattedCounts)
    } catch (error) {
        console.error("Error fetching notification counts:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
