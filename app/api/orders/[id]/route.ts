import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params

        if (!id) {
            return NextResponse.json({ error: "Order ID required" }, { status: 400 })
        }

        const order = await prisma.order.findUnique({
            where: { id },
            include: { customer: { select: { id: true, name: true, company: true, phone: true } } }
        })

        if (!order) return NextResponse.json({ error: "Siparis bulunamadi" }, { status: 404 })

        const auth = await requirePermission("orders", "view", order.branchId)
        if (auth instanceof NextResponse) return auth

        return NextResponse.json(order)
    } catch (error) {
        console.error("Error fetching order by id:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
