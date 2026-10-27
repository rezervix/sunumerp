import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"
import { isDemoModeActive, getMockData } from "@/lib/data-controller"

export async function GET(req: Request) {
    const auth = await getAuthPayload()
    if (!auth) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get("branchId")

    if (!branchId) {
        return NextResponse.json({ error: "Branch ID required" }, { status: 400 })
    }

    if (isDemoModeActive()) {
        return NextResponse.json(getMockData("stats", branchId))
    }

    try {
        const [
            customerCount,
            projectCount,
            activeProjectCount,
            leadCount,
            orderCount,
            pendingOrderCount,
            incomeAgg,
            expenseAgg,
            spendingByKindRaw,
            recentOrdersData,
            recentProjectsData,
            recentLeadsData
        ] = await Promise.all([
            prisma.customer.count({ where: { branchId } }),
            prisma.project.count({ where: { branchId } }),
            prisma.project.count({ where: { branchId, status: "active" } }),
            prisma.lead.count({ where: { branchId } }),
            prisma.order.count({ where: { branchId } }),
            prisma.order.count({ where: { branchId, status: "pending" } }),
            prisma.finance.aggregate({
                where: { branchId, type: "INCOME" },
                _sum: { amount: true },
            }),
            prisma.finance.aggregate({
                where: { branchId, type: "EXPENSE" },
                _sum: { amount: true },
            }),
            prisma.finance.groupBy({
                by: ["category"],
                where: { branchId, type: "EXPENSE" },
                _sum: { amount: true },
                orderBy: { _sum: { amount: "desc" } },
            }),
            prisma.order.findMany({
                where: { branchId },
                orderBy: { createdAt: "desc" },
                take: 5,
                include: { customer: { select: { name: true } } }
            }),
            prisma.project.findMany({
                where: { branchId },
                orderBy: { createdAt: "desc" },
                take: 5,
                select: { id: true, name: true, status: true, createdAt: true }
            }),
            prisma.lead.findMany({
                where: { branchId },
                orderBy: { createdAt: "desc" },
                take: 5,
                select: { id: true, name: true, status: true, createdAt: true }
            })
        ])

        const totalIncome = incomeAgg._sum.amount ?? 0
        const totalExpense = expenseAgg._sum.amount ?? 0
        const netProfit = totalIncome - totalExpense

        const spendingByKind = spendingByKindRaw.map(g => ({
            name: g.category || "Genel",
            value: g._sum.amount ?? 0,
        }))

        const recentOrders = recentOrdersData.map(o => ({
            id: o.id,
            type: "Siparis",
            description: `${o.customer?.name || 'Musteri'} - ${o.title}`,
            time: new Date(o.createdAt).toLocaleDateString("tr-TR"),
            rawDate: new Date(o.createdAt)
        }))

        const recentProjects = recentProjectsData.map(p => ({
            id: p.id,
            type: "Proje",
            description: `${p.name} olusturuldu`,
            time: new Date(p.createdAt).toLocaleDateString("tr-TR"),
            rawDate: new Date(p.createdAt)
        }))

        const recentLeads = recentLeadsData.map(l => ({
            id: l.id,
            type: "Musteri Adayi",
            description: `${l.name} eklendi`,
            time: new Date(l.createdAt).toLocaleDateString("tr-TR"),
            rawDate: new Date(l.createdAt)
        }))

        const allActivities = [...recentOrders, ...recentProjects, ...recentLeads]
            .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())
            .slice(0, 10)

        return NextResponse.json({
            customers: customerCount,
            projects: projectCount,
            activeProjects: activeProjectCount,
            leads: leadCount,
            orders: orderCount,
            pendingOrders: pendingOrderCount,
            income: totalIncome,
            expense: totalExpense,
            spendingByKind: spendingByKind,
            netProfit: netProfit,
            recentActivities: allActivities
        })
    } catch (error) {
        console.error("Error fetching stats:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

