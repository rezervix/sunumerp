import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission, isSuperAdminUser } from "@/lib/auth/server-permission"

export async function POST(req: Request) {
    const auth = await requirePermission("dashboard", "read")
    if (auth instanceof NextResponse) {
        return auth
    }
    const userId = auth.payload.userId

    // Rol Kontrolü: Yönetici, Koordinatör veya Admin olmalı
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { position: true, fullName: true } })
    const userPosition = (user?.position || "").trim().toLowerCase()
    const isSuperAdmin = await isSuperAdminUser(userId)
    const isManager = userPosition === "yönetici" || userPosition === "koordinatör" || auth.payload.roleName === "admin" || isSuperAdmin

    if (!isManager) {
        return NextResponse.json({ error: "Bu işlem için yetkiniz bulunmamaktadır." }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { taskId, newAssigneeId } = body

        if (!taskId || !newAssigneeId) {
            return NextResponse.json({ error: "taskId ve newAssigneeId alanları zorunludur." }, { status: 400 })
        }

        const task = await prisma.internalTask.findUnique({
            where: { id: taskId }
        })

        if (!task) {
            return NextResponse.json({ error: "Görev bulunamadı." }, { status: 404 })
        }

        const newAssignee = await prisma.user.findUnique({
            where: { id: newAssigneeId }
        })

        if (!newAssignee) {
            return NextResponse.json({ error: "Yeni atanacak personel bulunamadı." }, { status: 404 })
        }

        // Eğer eski assignee üzerinde bu görev şu an aktifse, onu duraklat
        const oldAssigneeId = task.assigneeId
        const activeTask = await prisma.activeTask.findUnique({
            where: { userId: oldAssigneeId }
        })

        if (activeTask && activeTask.taskId === taskId) {
            // Aktif görev kaydını sil
            await prisma.activeTask.delete({
                where: { userId: oldAssigneeId }
            })

            // Duraklatma logunu kaydet
            await prisma.internalTaskStatusLog.create({
                data: {
                    taskId,
                    userId: oldAssigneeId,
                    status: "PAUSE",
                    startedAt: activeTask.startedAt,
                    endedAt: new Date(),
                    note: "Görev başka bir personele devredildiği için sistem tarafından duraklatıldı."
                }
            })
        }

        // Görevi yeni personele ata ve durumunu TODO yap (veya olduğu gibi bırakıp devret)
        const updatedTask = await prisma.internalTask.update({
            where: { id: taskId },
            data: {
                assigneeId: newAssigneeId,
                status: "TODO" // Yeni atandığı için TODO durumuna çekmek mantıklıdır
            }
        })

        // Yeni atanan kişiye bildirim gönder
        await prisma.notification.create({
            data: {
                userId: newAssigneeId,
                title: "Yeni Görev Devredildi",
                message: `${user?.fullName || "Yönetici"} size bir görev devretti: '${task.title}'`,
                type: "task",
                moduleType: "tasks",
                taskId: task.id
            }
        })

        // Eski atanan kişiye bildirim gönder
        await prisma.notification.create({
            data: {
                userId: oldAssigneeId,
                title: "Görev Üzerinizden Alındı",
                message: `'${task.title}' adlı göreviniz başka bir personele devredilmiştir.`,
                type: "info",
                moduleType: "tasks",
                taskId: task.id
            }
        })

        return NextResponse.json({ success: true, task: updatedTask })
    } catch (error) {
        console.error("Error reassigning task:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
