import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

export async function GET(req: Request) {
    const auth = await requirePermission("users", "view")
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const action = searchParams.get("action")
    const resource = searchParams.get("resource")
    const take = parseInt(searchParams.get("take") || "50")
    const skip = parseInt(searchParams.get("skip") || "0")

    try {
        const where: any = {}
        if (userId) where.userId = userId
        if (action) where.action = action
        if (resource) where.resource = resource

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            fullName: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                take,
                skip,
            }),
            prisma.auditLog.count({ where })
        ])

        const formatted = logs.map(l => ({
            id: l.id,
            userId: l.userId,
            username: l.user?.username || "unknown",
            userFullName: l.user?.fullName || "Bilinmeyen Kullanıcı",
            action: l.action,
            resource: l.resource,
            resourceId: l.resourceId,
            details: (() => {
                try {
                    return typeof l.details === "string" ? JSON.parse(l.details) : l.details
                } catch {
                    return l.details
                }
            })(),
            createdAt: l.createdAt
        }))

        return NextResponse.json({ data: formatted, total, page: Math.floor(skip / take) + 1, pageSize: take })
    } catch (error) {
        console.error("Error fetching audit logs:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
