import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"

export async function GET(req: Request) {
    const auth = await getAuthPayload()
    if (!auth) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = auth.userId

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "10")))
    const skip = (page - 1) * pageSize

    try {
        const [records, total] = await Promise.all([
            prisma.calculationHistory.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                take: pageSize,
                skip,
            }),
            prisma.calculationHistory.count({ where: { userId } }),
        ])

        return NextResponse.json({
            data: records,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        })
    } catch (error) {
        console.error("Error fetching calculation history:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    const auth = await getAuthPayload()
    if (!auth) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = auth.userId

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) {
        return NextResponse.json({ error: "ID zorunludur" }, { status: 400 })
    }

    try {
        const record = await prisma.calculationHistory.findUnique({ where: { id }, select: { userId: true } })
        if (!record) return NextResponse.json({ error: "Kayit bulunamadi" }, { status: 404 })
        if (record.userId !== userId) {
            return NextResponse.json({ error: "Bu kayda erisim yetkiniz yok" }, { status: 403 })
        }

        await prisma.calculationHistory.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting calculation history:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

