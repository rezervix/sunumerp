import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { requirePermission } from "@/lib/auth/server-permission"
import { isDemoModeActive, getMockData } from "@/lib/data-controller"

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

// GET /api/b2b/products
export async function GET(req: Request) {
    if (isDemoModeActive()) {
        return NextResponse.json(getMockData("products"))
    }
    const auth = await requirePermission("magaza", "read")
    if (auth instanceof NextResponse) return auth

    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const includeInactive = searchParams.get("includeInactive") === "true"

    try {
        const products = await prisma.product.findMany({
            where: includeInactive ? {} : { isActive: true },
            include: { prices: { include: { branch: { select: { id: true, name: true } } } } },
            orderBy: { name: "asc" },
        })
        return NextResponse.json(products)
    } catch (error) {
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
        const { name, description, unit } = body

        if (!name) return NextResponse.json({ error: "Ürün adı zorunludur" }, { status: 400 })

        const product = await prisma.product.create({ data: { name, description, unit } })
        return NextResponse.json(product)
    } catch (error) {
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
        const { id, name, description, unit, isActive } = body

        if (!id) return NextResponse.json({ error: "ID zorunludur" }, { status: 400 })

        const product = await prisma.product.update({
            where: { id },
            data: { name, description, unit, isActive },
        })
        return NextResponse.json(product)
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    const auth = await requirePermission("magaza", "delete")
    if (auth instanceof NextResponse) return auth
    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID zorunludur" }, { status: 400 })

    try {
        await prisma.product.update({ where: { id }, data: { isActive: false } })
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
