import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"
import { isDemoModeActive, getMockData } from "@/lib/data-controller"

export async function GET(req: Request) {
    const auth = await getAuthPayload()
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (isDemoModeActive()) {
        const users = getMockData("chat_users") as any[]
        // Exclude the current user if possible
        return NextResponse.json(users.filter(u => u.id !== auth.userId))
    }

    try {
        const users = await prisma.user.findMany({
            where: { isActive: true },
            select: {
                id: true,
                username: true,
                fullName: true,
            },
            orderBy: { fullName: "asc" }
        })

        return NextResponse.json(users)
    } catch (error) {
        console.error("Error fetching chat users:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
