import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requirePermission("dashboard", "read")
    if (auth instanceof NextResponse) {
        return auth
    }
    const userId = auth.payload.userId
    
    // 3. ROL KONTROLÜ: Normalizasyon
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { position: true, fullName: true } })
    const userPosition = (user?.position || "").trim().toLowerCase()
    const isManager = userPosition === "yönetici" || userPosition === "koordinatör" || auth.payload.roleName === "admin"

    const { id } = await params

    try {
        const body = await req.json()
        const { status, priority, description, attachments, branchId } = body

        const currentTask = await prisma.internalTask.findUnique({ where: { id } })
        if (!currentTask) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 })
        }

        // Personel sadece kendi görevini guncelleyebilir, Yonetici herkesin gorevini.
        if (!isManager && currentTask.assigneeId !== userId) {
            return NextResponse.json({ error: "Yetkiniz yok." }, { status: 403 })
        }

        const updateData: any = {}
        if (status) updateData.status = status
        if (priority && isManager) updateData.priority = priority 
        if (description !== undefined && isManager) updateData.description = description
        if (branchId !== undefined && isManager) updateData.branchId = branchId || null
        
        if (attachments) {
            const currentAttachments = JSON.parse(currentTask.attachments || "[]")
            const newAttachments = Array.isArray(attachments) ? attachments : [attachments]
            updateData.attachments = JSON.stringify([...currentAttachments, ...newAttachments])
        }

        const task = await prisma.internalTask.update({
            where: { id },
            data: updateData,
            include: {
                assignee: { select: { id: true, fullName: true, avatarUrl: true } },
                assigner: { select: { id: true, fullName: true, avatarUrl: true } },
                branch: { select: { id: true, name: true, themeColor: true } }
            }
        })

        // Eger statu degistiyse, yoneticiye bildirim at
        if (status && status !== currentTask.status) {
            let statusText = status === "IN_PROGRESS" ? "Devam Ediyor" : status === "REVIEW" ? "İncelemede" : status === "DONE" ? "Tamamlandı" : "Bekliyor";
            await prisma.notification.create({
                data: {
                    userId: task.assignerId,
                    title: "Görev Durumu Güncellendi",
                    message: `${user?.fullName}, '${task.title}' görevinin durumunu '${statusText}' olarak güncelledi.`,
                    type: "info",
                    moduleType: "tasks",
                    taskId: task.id
                }
            })
        }

        return NextResponse.json(task)
    } catch (error) {
        console.error("Error updating task:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requirePermission("dashboard", "read")
    if (auth instanceof NextResponse) {
        return auth
    }
    const userId = auth.payload.userId
    
    // 3. ROL KONTROLÜ: Normalizasyon
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { position: true, fullName: true } })
    const userPosition = (user?.position || "").trim().toLowerCase()
    const isManager = userPosition === "yönetici" || userPosition === "koordinatör" || auth.payload.roleName === "admin"
    
    if (!isManager) {
        return NextResponse.json({ error: "Sadece yöneticiler görev silebilir." }, { status: 403 })
    }

    const { id } = await params

    try {
        await prisma.internalTask.delete({
            where: { id }
        })
        
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting task:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
