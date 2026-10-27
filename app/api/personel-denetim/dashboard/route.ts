import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission, isSuperAdminUser } from "@/lib/auth/server-permission"

export async function GET(req: Request) {
    const auth = await requirePermission("dashboard", "read")
    if (auth instanceof NextResponse) {
        return auth
    }
    const userId = auth.payload.userId

    const { searchParams } = new URL(req.url)
    const viewRole = searchParams.get("role") || "management" // management | leader | hr
    const searchUser = searchParams.get("searchUser") || ""
    const period = searchParams.get("period") || "month" // week | month | quarter
    const filterDept = searchParams.get("department") || ""

    try {
        const now = new Date()

        // Ortak veri çekimleri
        const allUsers = await prisma.user.findMany({
            where: { isActive: true },
            select: {
                id: true,
                fullName: true,
                username: true,
                email: true,
                department: true,
                position: true,
                avatarUrl: true
            }
        })

        const activeTasks = await prisma.activeTask.findMany({
            include: {
                task: { select: { id: true, title: true, priority: true, dueDate: true } }
            }
        })

        const allTasks = await prisma.internalTask.findMany({
            include: {
                assignee: { select: { id: true, fullName: true, department: true } }
            }
        })

        // Period sınırları hesaplama
        let startDate = new Date()
        if (period === "week") {
            startDate.setDate(now.getDate() - 7)
        } else if (period === "quarter") {
            startDate.setDate(now.getDate() - 90)
        } else {
            startDate.setDate(now.getDate() - 30) // default month
        }

        const statusLogs = await prisma.internalTaskStatusLog.findMany({
            where: {
                startedAt: { gte: startDate }
            },
            include: {
                task: { select: { id: true, title: true, dueDate: true } }
            }
        })

        // ==========================================
        // 1. ÜST YÖNETİM (MANAGEMENT) DASHBOARD HESAPLAMALARI
        // ==========================================
        if (viewRole === "management") {
            // Tamamlanma oranları ve süreleri
            const completedLogs = statusLogs.filter(log => log.status === "COMPLETE")
            const completedCount = completedLogs.length
            
            let totalDurationMs = 0
            completedLogs.forEach(log => {
                if (log.endedAt) {
                    totalDurationMs += new Date(log.endedAt).getTime() - new Date(log.startedAt).getTime()
                }
            })
            const avgDurationHours = completedCount > 0 
                ? parseFloat((totalDurationMs / (1000 * 60 * 60 * completedCount)).toFixed(1)) 
                : 0

            const openTasks = allTasks.filter(t => t.status !== "DONE")
            const overdueCount = openTasks.filter(t => t.dueDate && new Date(t.dueDate) < now).length
            const totalTasksInPeriod = completedCount + openTasks.length
            const completionRate = totalTasksInPeriod > 0 
                ? Math.round((completedCount / totalTasksInPeriod) * 100) 
                : 0

            // Uyarı Listesi
            const warnings: any[] = []

            // A) Geciken görevler
            openTasks.filter(t => t.dueDate && new Date(t.dueDate) < now).forEach(t => {
                warnings.push({
                    type: "overdue",
                    message: `'${t.title}' görevinin süresi dolmuş.`,
                    assignee: t.assignee?.fullName || "Belirtilmemiş",
                    department: t.assignee?.department || "Belirtilmemiş",
                    date: t.dueDate
                })
            })

            // B) 4 saattir aktif kalan görevler
            activeTasks.forEach(at => {
                const elapsedHours = (now.getTime() - new Date(at.startedAt).getTime()) / (1000 * 60 * 60)
                if (elapsedHours > 4) {
                    const userObj = allUsers.find(u => u.id === at.userId)
                    warnings.push({
                        type: "long_active",
                        message: `'${at.task.title}' görevi 4 saatten uzun süredir aktif.`,
                        assignee: userObj?.fullName || "Belirtilmemiş",
                        department: userObj?.department || "Belirtilmemiş",
                        duration: Math.round(elapsedHours)
                    })
                }
            })

            // C) Aktif görevi olmayanlar (Boşta olanlar)
            const activeUserIds = new Set(activeTasks.map(at => at.userId))
            allUsers.forEach(u => {
                if (!activeUserIds.has(u.id)) {
                    warnings.push({
                        type: "idle",
                        message: "Şu anda herhangi bir aktif görev üzerinde çalışmıyor.",
                        assignee: u.fullName,
                        department: u.department || "Belirtilmemiş"
                    })
                }
            })

            // Departman bazlı karşılaştırmalar (Moral bozucu lig usulü olmayan, eşik bazlı)
            const deptStats: Record<string, { total: number; completed: number; overdue: number }> = {}
            allUsers.forEach(u => {
                if (u.department && !deptStats[u.department]) {
                    deptStats[u.department] = { total: 0, completed: 0, overdue: 0 }
                }
            })

            allTasks.forEach(t => {
                const dept = t.assignee?.department
                if (dept && deptStats[dept]) {
                    deptStats[dept].total++
                    if (t.status === "DONE") {
                        deptStats[dept].completed++
                    } else if (t.dueDate && new Date(t.dueDate) < now) {
                        deptStats[dept].overdue++
                    }
                }
            })

            const departmentMetrics = Object.entries(deptStats).map(([name, stats]) => {
                const total = stats.total
                const rate = total > 0 ? Math.round((stats.completed / total) * 100) : 0
                return {
                    name,
                    completionRate: rate,
                    overdueCount: stats.overdue,
                    totalTasks: total,
                    completedTasks: stats.completed,
                    alert: rate < 60 ? "Düşük Tamamlama Oranı (%60 altı)" : null
                }
            })

            // Trend Grafiği (Son 7 günün tamamlanma verileri)
            const trendData: any[] = []
            for (let i = 6; i >= 0; i--) {
                const d = new Date()
                d.setDate(now.getDate() - i)
                const dateKey = d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })
                const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
                const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)

                const dailyCompleted = statusLogs.filter(log => 
                    log.status === "COMPLETE" && 
                    new Date(log.startedAt) >= startOfDay && 
                    new Date(log.startedAt) <= endOfDay
                )

                const dayEntry: any = { date: dateKey }
                const depts = Array.from(new Set(allUsers.map(u => u.department).filter(Boolean)))
                depts.forEach(dept => {
                    const deptUsers = new Set(allUsers.filter(u => u.department === dept).map(u => u.id))
                    const deptCompleted = dailyCompleted.filter(log => deptUsers.has(log.userId)).length
                    dayEntry[dept as string] = deptCompleted
                })
                trendData.push(dayEntry)
            }

            // Hızlı Arama Widget Sonucu
            let searchResult = null
            if (searchUser) {
                const targetUser = allUsers.find(u => 
                    u.fullName.toLowerCase().includes(searchUser.toLowerCase()) || 
                    u.username.toLowerCase().includes(searchUser.toLowerCase())
                )
                if (targetUser) {
                    const userActive = activeTasks.find(at => at.userId === targetUser.id)
                    const userTasks = allTasks.filter(t => t.assigneeId === targetUser.id)
                    const userCompletions = statusLogs.filter(log => log.userId === targetUser.id && log.status === "COMPLETE")
                    
                    searchResult = {
                        user: targetUser,
                        activeTask: userActive ? {
                            title: userActive.task.title,
                            startedAt: userActive.startedAt
                        } : null,
                        weeklyCompletions: userCompletions.length,
                        totalOpenTasks: userTasks.filter(t => t.status !== "DONE").length
                    }
                }
            }

            return NextResponse.json({
                summary: {
                    completedCount,
                    avgDurationHours,
                    overdueCount,
                    completionRate
                },
                warnings: warnings.slice(0, 15), // Limiting warnings list size
                departmentMetrics,
                trendData,
                searchResult
            })
        }

        // ==========================================
        // 2. ORTA KADEME YÖNETİCİ (TEAM LEADER) GÖRÜNÜMÜ
        // ==========================================
        if (viewRole === "leader") {
            // Departman filtresi (Ekip lideri sadece kendi ekibini görsün, eğer filterDept varsa ona göre)
            const currentUser = allUsers.find(u => u.id === userId)
            const deptFilter = filterDept || currentUser?.department || ""

            const filteredUsers = deptFilter 
                ? allUsers.filter(u => u.department === deptFilter) 
                : allUsers

            const teamList = filteredUsers.map(member => {
                const memberActive = activeTasks.find(at => at.userId === member.id)
                const memberTasks = allTasks.filter(t => t.assigneeId === member.id)

                const todoCount = memberTasks.filter(t => t.status === "TODO").length
                const inProgressCount = memberTasks.filter(t => t.status === "IN_PROGRESS").length
                const reviewCount = memberTasks.filter(t => t.status === "REVIEW").length
                const doneCount = memberTasks.filter(t => t.status === "DONE").length

                return {
                    id: member.id,
                    fullName: member.fullName,
                    avatarUrl: member.avatarUrl,
                    position: member.position,
                    department: member.department,
                    activeTask: memberActive ? {
                        id: memberActive.task.id,
                        title: memberActive.task.title,
                        startedAt: memberActive.startedAt
                    } : null,
                    workload: {
                        todo: todoCount,
                        inProgress: inProgressCount,
                        review: reviewCount,
                        done: doneCount,
                        totalOpen: todoCount + inProgressCount + reviewCount
                    }
                }
            })

            // Günlük özet (Bugün tamamlanan, başlanan ve geciken görevler)
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
            const todayCompleted = statusLogs.filter(l => l.status === "COMPLETE" && new Date(l.startedAt) >= todayStart).length
            const todayStarted = statusLogs.filter(l => (l.status === "START" || l.status === "RESUME") && new Date(l.startedAt) >= todayStart).length
            const teamOverdue = allTasks.filter(t => 
                t.status !== "DONE" && 
                t.dueDate && 
                new Date(t.dueDate) < now && 
                (!deptFilter || t.assignee?.department === deptFilter)
            ).length

            return NextResponse.json({
                teamList,
                dailySummary: {
                    completed: todayCompleted,
                    started: todayStarted,
                    overdue: teamOverdue
                }
            })
        }

        // ==========================================
        // 3. İK / PERFORMANS DEĞERLENDİRME
        // ==========================================
        if (viewRole === "hr") {
            // Dönemsel performans analizleri
            const hrReports = allUsers.map(member => {
                const memberLogs = statusLogs.filter(log => log.userId === member.id)
                const completed = memberLogs.filter(l => l.status === "COMPLETE")
                const completedCount = completed.length

                // Ortalama süre hesaplama
                let totalDur = 0
                completed.forEach(log => {
                    if (log.endedAt) {
                        totalDur += new Date(log.endedAt).getTime() - new Date(log.startedAt).getTime()
                    }
                })
                const avgHours = completedCount > 0 
                    ? parseFloat((totalDur / (1000 * 60 * 60 * completedCount)).toFixed(1)) 
                    : 0

                // Zamanında teslim oranı
                let onTimeCount = 0
                completed.forEach(log => {
                    if (log.task?.dueDate) {
                        const delivered = new Date(log.endedAt || now)
                        const deadline = new Date(log.task.dueDate)
                        if (delivered <= deadline) {
                            onTimeCount++
                        }
                    } else {
                        // Bitiş tarihi yoksa zamanında sayıyoruz
                        onTimeCount++
                    }
                })
                const onTimeRate = completedCount > 0 
                    ? Math.round((onTimeCount / completedCount) * 100) 
                    : 100

                // Kişinin tüm atanan görevleri
                const memberTasks = allTasks.filter(t => t.assigneeId === member.id)
                const completionRate = memberTasks.length > 0 
                    ? Math.round((memberTasks.filter(t => t.status === "DONE").length / memberTasks.length) * 100)
                    : 100

                return {
                    id: member.id,
                    fullName: member.fullName,
                    department: member.department,
                    position: member.position,
                    completedCount,
                    avgHours,
                    onTimeRate,
                    completionRate
                }
            })

            // İsim ifşa etmeden akran ortalaması (Departman ortalamaları)
            const deptAverages: Record<string, { totalRate: number; totalHours: number; count: number }> = {}
            hrReports.forEach(rep => {
                const dept = rep.department || "Genel"
                if (!deptAverages[dept]) {
                    deptAverages[dept] = { totalRate: 0, totalHours: 0, count: 0 }
                }
                deptAverages[dept].totalRate += rep.completionRate
                deptAverages[dept].totalHours += rep.avgHours
                deptAverages[dept].count++
            })

            const peerAverages = Object.entries(deptAverages).map(([name, val]) => ({
                department: name,
                avgCompletionRate: val.count > 0 ? Math.round(val.totalRate / val.count) : 0,
                avgHours: val.count > 0 ? parseFloat((val.totalHours / val.count).toFixed(1)) : 0
            }))

            // Ham log verileri (Denetim için)
            const rawLogs = statusLogs.map(log => {
                const userObj = allUsers.find(u => u.id === log.userId)
                return {
                    id: log.id,
                    taskId: log.taskId,
                    taskTitle: log.task?.title || "Bilinmeyen Görev",
                    userId: log.userId,
                    userFullName: userObj?.fullName || "Bilinmeyen Personel",
                    department: userObj?.department || "Bilinmeyen Departman",
                    status: log.status,
                    startedAt: log.startedAt,
                    endedAt: log.endedAt,
                    note: log.note
                }
            }).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())

            return NextResponse.json({
                hrReports,
                peerAverages,
                rawLogs
            })
        }

        return NextResponse.json({ error: "Invalid role specified." }, { status: 400 })
    } catch (error) {
        console.error("Error gathering dashboard statistics:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
