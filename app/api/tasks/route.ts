import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

export async function GET(req: Request) {
    const auth = await requirePermission("dashboard", "read")
    if (auth instanceof NextResponse) {
        return auth
    }
    const userId = auth.payload.userId

    // 3. ROL KONTROLÜ: Normalizasyon (büyük/küçük harf ve boşluk duyarsızlığı)
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { position: true, fullName: true } })
    const userPosition = (user?.position || "").trim().toLowerCase()
    const isManager = userPosition === "yönetici" || userPosition === "koordinatör" || auth.payload.roleName === "admin"

    const { searchParams } = new URL(req.url)
    const assigneeId = searchParams.get("assigneeId")

    try {
        // 2. PERFORMANS/YARIŞ DURUMU: JIT bildirim taramasını sadece istek atan kullanıcının ilgili görevleri ile sınırla
        // Tüm sistem yerine sadece kullanıcının alıcısı veya vereni olduğu aktif (DONE olmayan) ve süresi geçmiş görevler.
        const overdueTasks = await prisma.internalTask.findMany({
            where: {
                status: { not: "DONE" },
                dueDate: { lt: new Date() },
                OR: [
                    { assigneeId: userId },
                    { assignerId: userId }
                ]
            }
        })

        for (const task of overdueTasks) {
            // 1. GECİKME BİLDİRİMİ DEDUP HATASI: Bildirimi tekilleştirmek için taskId filtresini ekledik
            const existingNotif = await prisma.notification.findFirst({
                where: {
                    userId: task.assigneeId,
                    moduleType: "tasks",
                    title: "Görev Gecikti!",
                    taskId: task.id // Tekilleştirme artık görev bazında yapılıyor
                }
            })

            if (!existingNotif) {
                // Sorumluya bildirim
                await prisma.notification.create({
                    data: {
                        userId: task.assigneeId,
                        title: "Görev Gecikti!",
                        message: `'${task.title}' adlı görevinizin bitiş tarihi geçti.`,
                        type: "warning",
                        moduleType: "tasks",
                        taskId: task.id
                    }
                })
                // Atayana bildirim
                await prisma.notification.create({
                    data: {
                        userId: task.assignerId,
                        title: "Görev Gecikti!",
                        message: `${task.assigneeId === userId ? 'Size atanan' : 'Atadığınız'} '${task.title}' görevinin süresi doldu.`,
                        type: "warning",
                        moduleType: "tasks",
                        taskId: task.id
                    }
                })
            }
        }

        const whereClause: any = {}
        
        if (!isManager) {
            whereClause.assigneeId = userId
        } else {
            if (assigneeId) {
                whereClause.assigneeId = assigneeId
            }
        }

        const tasks = await prisma.internalTask.findMany({
            where: whereClause,
            include: {
                assignee: { select: { id: true, fullName: true, avatarUrl: true } },
                assigner: { select: { id: true, fullName: true, avatarUrl: true } },
                branch: { select: { id: true, name: true, themeColor: true } }
            },
            orderBy: { createdAt: "desc" }
        })

        return NextResponse.json({ data: tasks, isManager })
    } catch (error) {
        console.error("Error fetching tasks:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const auth = await requirePermission("dashboard", "read")
    if (auth instanceof NextResponse) {
        return auth
    }
    const userId = auth.payload.userId
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { position: true, fullName: true } })
    const userPosition = (user?.position || "").trim().toLowerCase()
    const isManager = userPosition === "yönetici" || userPosition === "koordinatör" || auth.payload.roleName === "admin"

    if (!isManager) {
        return NextResponse.json({ error: "Sadece yöneticiler görev oluşturabilir." }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { title, description, priority, dueDate, assigneeId, attachments, branchId } = body

        if (!title || !assigneeId) {
            return NextResponse.json({ error: "Title and assigneeId are required" }, { status: 400 })
        }

        const task = await prisma.internalTask.create({
            data: {
                title,
                description,
                priority: priority || "MEDIUM",
                status: "TODO",
                dueDate: dueDate ? new Date(dueDate) : null,
                assignerId: userId,
                assigneeId,
                branchId: branchId || null,
                attachments: attachments ? JSON.stringify(attachments) : "[]"
            },
            include: {
                assignee: { select: { id: true, fullName: true, avatarUrl: true } },
                assigner: { select: { id: true, fullName: true, avatarUrl: true } },
                branch: { select: { id: true, name: true, themeColor: true } }
            }
        })

        // Bildirim Gonder
        await prisma.notification.create({
            data: {
                userId: assigneeId,
                title: "Yeni Görev Atandı",
                message: `${user?.fullName} size yeni bir görev atadı: ${title}`,
                type: "task",
                moduleType: "tasks",
                taskId: task.id
            }
        })

        return NextResponse.json(task, { status: 201 })
    } catch (error) {
        console.error("Error creating task:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
async function generatePrismaClientAndPush() {
    // Sadece build veya debug senaryosu için yardımcı
}
