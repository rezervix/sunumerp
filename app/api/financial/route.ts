import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"
import { isDemoModeActive, getMockData } from "@/lib/data-controller"

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get("branchId")

    if (!branchId) {
        return NextResponse.json({ error: "Branch ID required" }, { status: 400 })
    }

    const auth = await requirePermission("finance", "view", branchId)
    if (auth instanceof NextResponse) return auth

    if (isDemoModeActive()) {
        const records = getMockData("finance", branchId)
        return NextResponse.json(records)
    }

    try {
        const records = await prisma.finance.findMany({
            where: { branchId },
            orderBy: { date: "desc" },
        })
        return NextResponse.json(records)
    } catch (error) {
        console.error("Error fetching financial records:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { branchId, type, amount, category, description, date, client } = body

        if (!branchId || !type || !amount) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const auth = await requirePermission("finance", "create", branchId)
        if (auth instanceof NextResponse) return auth

        if (isDemoModeActive()) {
            return NextResponse.json({
                id: `fin-demo-${Date.now()}`,
                branchId,
                type,
                amount: parseFloat(amount),
                category: body.expenseCategory || category || "Genel",
                description: description || "Demo Finans Kaydı",
                date: date ? new Date(date).toISOString() : new Date().toISOString(),
                status: "approved"
            })
        }

        let finalDescription = description || ""
        if (client) {
            finalDescription = `${finalDescription} (Müşteri: ${client})`.trim()
        }

        const record = await prisma.finance.create({
            data: {
                branchId,
                type,
                amount: parseFloat(amount),
                category: body.expenseCategory || category || "Genel",
                description: finalDescription,
                date: date ? new Date(date) : new Date(),
                status: "approved"
            }
        })
        return NextResponse.json(record)
    } catch (error) {
        console.error("Error creating financial record:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
