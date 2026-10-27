import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

export async function GET() {
    // Giriş yapmış kullanıcılara izin verelim
    const auth = await requirePermission("users", "view")
    if (auth instanceof NextResponse) return auth

    try {
        const modules = await prisma.module.findMany({
            orderBy: { sortOrder: "asc" }
        })
        return NextResponse.json(modules)
    } catch (error) {
        console.error("Error fetching modules:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
