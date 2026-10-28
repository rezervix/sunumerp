import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"
import { isDemoModeActive, getMockData } from "@/lib/data-controller"

export async function GET(req: Request) {
    const auth = await requirePermission("cargo", "view")
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get("branchId")

    if (isDemoModeActive()) {
        const cargoList = getMockData("cargo", branchId) as any[]
        return NextResponse.json({
            data: cargoList,
            total: cargoList.length,
            page: 1,
            pageSize: 20
        })
    }

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

        if (isDemoModeActive()) {
            return NextResponse.json({
                id: `cargo-demo-${Date.now()}`,
                branchId,
                carrierName,
                trackingNumber,
                status: status || "in_transit",
                notes: notes || "Demo kargo kaydı",
                createdAt: new Date().toISOString()
            })
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
