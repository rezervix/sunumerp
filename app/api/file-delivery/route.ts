import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

export async function GET(req: Request) {
    const auth = await requirePermission("files", "read")
    if (auth instanceof NextResponse) return auth
    const user = auth.payload

    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get("branchId")

    try {
        const where = branchId ? {
            OR: [
                { fromBranchId: branchId },
                { toBranchId: branchId }
            ]
        } : {}
        const deliveries = await prisma.fileDelivery.findMany({
            where,
            include: { 
                fromBranch: { select: { id: true, name: true } },
                toBranch: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: "desc" },
        })
        return NextResponse.json(deliveries)
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const auth = await requirePermission("files", "create")
    if (auth instanceof NextResponse) return auth
    const user = auth.payload

    try {
        const body = await req.json()
        const { fromBranchId, toBranchId, fromUserId, toUserId, trackingNumber, title, description, fileUrls, status, priority } = body

        if (!fromBranchId || !trackingNumber || !title) {
            return NextResponse.json({ error: "Şube, takip numarası ve başlık zorunludur" }, { status: 400 })
        }

        const delivery = await prisma.fileDelivery.create({
            data: { 
                fromBranchId, 
                toBranchId, 
                fromUserId: fromUserId || user.userId, 
                toUserId, 
                trackingNumber, 
                title, 
                description, 
                fileUrls: fileUrls || "[]", 
                status: status || "sent", 
                priority: priority || "normal" 
            },
        })
        return NextResponse.json(delivery)
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    const auth = await requirePermission("files", "update")
    if (auth instanceof NextResponse) return auth
    const user = auth.payload

    try {
        const body = await req.json()
        const { id, toBranchId, toUserId, trackingNumber, title, description, fileUrls, status, priority } = body

        if (!id) return NextResponse.json({ error: "ID zorunludur" }, { status: 400 })

        const delivery = await prisma.fileDelivery.update({
            where: { id },
            data: { 
                toBranchId, 
                toUserId, 
                trackingNumber, 
                title, 
                description, 
                fileUrls, 
                status, 
                priority,
                ...(status === 'received' ? { receivedAt: new Date() } : {}),
                ...(status === 'completed' ? { completedAt: new Date() } : {})
            },
        })
        return NextResponse.json(delivery)
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    const auth = await requirePermission("files", "delete")
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID zorunludur" }, { status: 400 })

    try {
        await prisma.fileDelivery.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
