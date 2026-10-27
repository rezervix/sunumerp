import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { requirePermission } from "@/lib/auth/server-permission"

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"

async function getUser() {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value
    if (!token) return null
    try {
        const secret = new TextEncoder().encode(JWT_SECRET)
        const { payload } = await jwtVerify(token, secret)
        return payload
    } catch { return null }
}

export async function GET(req: Request) {
    const auth = await requirePermission("magaza", "read")
    if (auth instanceof NextResponse) return auth

    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get("branchId")

    try {
        const where = branchId ? { branchId } : {}
        const requests = await prisma.stockRequest.findMany({
            where,
            include: {
                product: true,
                branch: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
        })
        return NextResponse.json(requests)
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const auth = await requirePermission("magaza", "create")
    if (auth instanceof NextResponse) return auth
    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const body = await req.json()
        const { branchId, productId, customProduct, quantity, notes } = body

        if (!branchId || (!productId && !customProduct) || !quantity) {
            return NextResponse.json({ error: "Zorunlu alanlar eksik" }, { status: 400 })
        }

        const request = await prisma.stockRequest.create({
            data: { branchId, productId: productId || null, customProduct, quantity, notes },
        })
        return NextResponse.json(request)
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    const auth = await requirePermission("magaza", "update")
    if (auth instanceof NextResponse) return auth
    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const body = await req.json()
        const { id, status, approvedBy } = body

        if (!id) return NextResponse.json({ error: "ID zorunludur" }, { status: 400 })

        const request = await prisma.stockRequest.update({
            where: { id },
            data: { status, approvedBy },
        })
        return NextResponse.json(request)
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
