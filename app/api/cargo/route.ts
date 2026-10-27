import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

export async function GET(req: Request) {
    const auth = await requirePermission("cargo", "view")
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get("branchId")
    const take = parseInt(searchParams.get("take") || "20")
    const skip = parseInt(searchParams.get("skip") || "0")

    try {
        const where = branchId ? { branchId } : {}
        const [trackings, total] = await Promise.all([
            prisma.cargoTracking.findMany({
                where,
                include: { branch: { select: { id: true, name: true } } },
                orderBy: { createdAt: "desc" },
                take,
                skip,
            }),
            prisma.cargoTracking.count({ where }),
        ])
        return NextResponse.json({ data: trackings, total, page: Math.floor(skip / take) + 1, pageSize: take })
    } catch (error) {
        console.error("Error fetching cargo:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const auth = await requirePermission("cargo", "create")
    if (auth instanceof NextResponse) return auth

    try {
        const body = await req.json()
        const { branchId, carrierName, trackingNumber, status, notes } = body

        if (!branchId || !carrierName || !trackingNumber) {
            return NextResponse.json({ error: "Sube, kargo firmasi ve takip numarasi zorunludur" }, { status: 400 })
        }

        const tracking = await prisma.cargoTracking.create({
            data: { branchId, carrierName, trackingNumber, status: status || "in_transit", notes },
        })
        return NextResponse.json(tracking)
    } catch (error) {
        console.error("Error creating cargo:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json()
        const { id, status, notes, carrierName, trackingNumber } = body

        if (!id) return NextResponse.json({ error: "ID zorunludur" }, { status: 400 })

        // Find record to check branch permission
        const record = await prisma.cargoTracking.findUnique({ where: { id }, select: { branchId: true } })
        if (!record) return NextResponse.json({ error: "Kayit bulunamadi" }, { status: 404 })

        const auth = await requirePermission("cargo", "update", record.branchId)
        if (auth instanceof NextResponse) return auth

        const tracking = await prisma.cargoTracking.update({
            where: { id },
            data: { status, notes, carrierName, trackingNumber },
        })
        return NextResponse.json(tracking)
    } catch (error) {
        console.error("Error updating cargo:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID zorunludur" }, { status: 400 })

    try {
        const record = await prisma.cargoTracking.findUnique({ where: { id }, select: { branchId: true } })
        if (!record) return NextResponse.json({ error: "Kayit bulunamadi" }, { status: 404 })

        const auth = await requirePermission("cargo", "delete", record.branchId)
        if (auth instanceof NextResponse) return auth

        await prisma.cargoTracking.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting cargo:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

