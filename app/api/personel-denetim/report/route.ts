import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

export async function POST(req: Request) {
    const auth = await requirePermission("dashboard", "read")
    if (auth instanceof NextResponse) {
        return auth
    }
    const userId = auth.payload.userId

    try {
        const body = await req.json()
        const { taskId, action, note } = body

        if (!taskId || !action) {
            return NextResponse.json({ error: "taskId ve action alanları zorunludur." }, { status: 400 })
        }

        const task = await prisma.internalTask.findUnique({
            where: { id: taskId }
        })

        if (!task) {
            return NextResponse.json({ error: "Görev bulunamadı." }, { status: 404 })
        }

        const now = new Date()

        if (action === "START" || action === "RESUME") {
            // Kullanıcının mevcut aktif görevini bul
            const activeTask = await prisma.activeTask.findUnique({
                where: { userId }
            })

            if (activeTask) {
                // Eğer zaten aynı görev aktifse, bir şey yapmaya gerek yok
                if (activeTask.taskId === taskId) {
                    return NextResponse.json({ success: true, message: "Görev zaten aktif." })
                }

                // Farklı bir görev aktifse, önce eski görevi duraklat (PAUSE)
                const oldTaskId = activeTask.taskId
                const oldTaskActiveSince = activeTask.startedAt

                // 1. Aktif görev kaydını sil
                await prisma.activeTask.delete({
                    where: { userId }
                })

                // 2. Duraklatma logu oluştur
                await prisma.internalTaskStatusLog.create({
                    data: {
                        taskId: oldTaskId,
                        userId,
                        status: "PAUSE",
                        startedAt: oldTaskActiveSince,
                        endedAt: now,
                        note: "Farklı bir göreve geçildiği için sistem tarafından otomatik duraklatıldı."
                    }
                })

                // 3. Eski görevin statüsünü güncelle
                await prisma.internalTask.update({
                    where: { id: oldTaskId },
                    data: { status: "IN_PROGRESS" }
                })
            }

            // Yeni görevi başlat/devam ettir
            await prisma.activeTask.upsert({
                where: { userId },
                update: {
                    taskId,
                    startedAt: now
                },
                create: {
                    userId,
                    taskId,
                    startedAt: now
                }
            })

            await prisma.internalTaskStatusLog.create({
                data: {
                    taskId,
                    userId,
                    status: action,
                    startedAt: now,
                    note: action === "START" ? "Görev başlatıldı." : "Görev devam ettirildi."
                }
            })

            await prisma.internalTask.update({
                where: { id: taskId },
                data: { status: "IN_PROGRESS" }
            })

        } else if (action === "PAUSE") {
            const activeTask = await prisma.activeTask.findUnique({
                where: { userId }
            })

            if (!activeTask || activeTask.taskId !== taskId) {
                return NextResponse.json({ error: "Bu görev şu anda aktif değil." }, { status: 400 })
            }

            await prisma.activeTask.delete({
                where: { userId }
            })

            await prisma.internalTaskStatusLog.create({
                data: {
                    taskId,
                    userId,
                    status: "PAUSE",
                    startedAt: activeTask.startedAt,
                    endedAt: now,
                    note: note || "Görev duraklatıldı."
                }
            })

            await prisma.internalTask.update({
                where: { id: taskId },
                data: { status: "IN_PROGRESS" }
            })

        } else if (action === "COMPLETE") {
            const activeTask = await prisma.activeTask.findUnique({
                where: { userId }
            })

            let activeSince = now
            if (activeTask && activeTask.taskId === taskId) {
                activeSince = activeTask.startedAt
                await prisma.activeTask.delete({
                    where: { userId }
                })
            }

            await prisma.internalTaskStatusLog.create({
                data: {
                    taskId,
                    userId,
                    status: "COMPLETE",
                    startedAt: activeSince,
                    endedAt: now,
                    note: note || "Görev tamamlandı."
                }
            })

            await prisma.internalTask.update({
                where: { id: taskId },
                data: { status: "DONE" }
            })

            // Görevi atayan kişiye bildirim gönder
            if (task.assignerId !== userId) {
                const userObj = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } })
                await prisma.notification.create({
                    data: {
                        userId: task.assignerId,
                        title: "Görev Tamamlandı 🎉",
                        message: `${userObj?.fullName || "Personel"} '${task.title}' görevini tamamladı. Not: ${note || "Girilmedi"}`,
                        type: "success",
                        moduleType: "tasks",
                        taskId: task.id
                    }
                })
            }

        } else {
            return NextResponse.json({ error: "Geçersiz aksiyon." }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error reporting task action:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
