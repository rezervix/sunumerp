import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

async function checkAdmin() {
    const auth = await requirePermission("roles", "manage")
    return auth
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await checkAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    try {
        const role = await prisma.role.findUnique({
            where: { id },
            select: { permissions: true }
        })

        if (!role) {
            return NextResponse.json({ error: "Rol bulunamadi" }, { status: 404 })
        }

        const parsed = (() => { try { return JSON.parse(role.permissions) } catch { return {} } })()
        return NextResponse.json(parsed)
    } catch (error) {
        console.error("Error fetching permissions:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await checkAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await req.json()
    const { permissions } = body

    if (!permissions) {
        return NextResponse.json({ error: "Permissions are required" }, { status: 400 })
    }

    try {
        const existing = await prisma.role.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: "Rol bulunamadi" }, { status: 404 })
        }

        // Super Admin izinleri kısıtlanamaz veya düzenlenemez
        if (existing.name === "Super Admin") {
            return NextResponse.json({ error: "Super Admin izinleri düzenlenemez" }, { status: 400 })
        }

        const role = await prisma.role.update({
            where: { id },
            data: {
                permissions: typeof permissions === "string" ? permissions : JSON.stringify(permissions)
            }
        })

        const parsed = (() => { try { return JSON.parse(role.permissions) } catch { return {} } })()
        return NextResponse.json({ success: true, permissions: parsed })
    } catch (error) {
        console.error("Error updating permissions:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
