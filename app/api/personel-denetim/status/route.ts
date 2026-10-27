import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

export async function GET(req: Request) {
    const auth = await requirePermission("dashboard", "read")
    if (auth instanceof NextResponse) {
        return auth
    }
    const userId = auth.payload.userId

    try {
        // Aktif görevi ve ilişkili görev detayını getir
        const activeTaskRelation = await prisma.activeTask.findUnique({
            where: { userId },
            include: {
                task: {
                    include: {
                        assigner: { select: { id: true, fullName: true, avatarUrl: true } }
                    }
                }
            }
        })

        // Kullanıcının bitmemiş (TODO, IN_PROGRESS, REVIEW) tüm görevlerini getir
        const myTasks = await prisma.internalTask.findMany({
            where: {
                assigneeId: userId,
                status: { not: "DONE" }
            },
            include: {
                assigner: { select: { id: true, fullName: true, avatarUrl: true } }
            },
            orderBy: { createdAt: "desc" }
        })

        return NextResponse.json({
            activeTask: activeTaskRelation ? {
                id: activeTaskRelation.task.id,
                title: activeTaskRelation.task.title,
                description: activeTaskRelation.task.description,
                priority: activeTaskRelation.task.priority,
                dueDate: activeTaskRelation.task.dueDate,
                startedAt: activeTaskRelation.startedAt,
                assigner: activeTaskRelation.task.assigner
            } : null,
            myTasks
        })
    } catch (error) {
        console.error("Error fetching user active status:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
