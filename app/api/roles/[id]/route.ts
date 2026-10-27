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
            where: { id }
        })

        if (!role) {
            return NextResponse.json({ error: "Rol bulunamadi" }, { status: 404 })
        }

        return NextResponse.json({
            ...role,
            permissions: (() => { try { return JSON.parse(role.permissions) } catch { return {} } })()
        })
    } catch (error) {
        console.error("Error fetching role:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await checkAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await req.json()
    const { name, description, permissions } = body

    try {
        const existing = await prisma.role.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: "Rol bulunamadi" }, { status: 404 })
        }

        // Super Admin rolü ismi değiştirilemez veya izinleri düzenlenemez
        if (existing.name === "Super Admin" && name && name !== "Super Admin") {
            return NextResponse.json({ error: "Super Admin rolünün adı değiştirilemez" }, { status: 400 })
        }

        const updateData: { name?: string; description?: string; permissions?: string } = {}
        if (name !== undefined) updateData.name = name
        if (description !== undefined) updateData.description = description
        if (permissions !== undefined) {
            // Super Admin izinleri kısıtlanamaz
            if (existing.name === "Super Admin") {
                return NextResponse.json({ error: "Super Admin izinleri düzenlenemez" }, { status: 400 })
            }
            updateData.permissions = typeof permissions === "string" ? permissions : JSON.stringify(permissions)
        }

        const role = await prisma.role.update({
            where: { id },
            data: updateData
        })

        return NextResponse.json({
            ...role,
            permissions: (() => { try { return JSON.parse(role.permissions) } catch { return {} } })()
        })
    } catch (error) {
        console.error("Error updating role:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await checkAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    try {
        const existing = await prisma.role.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: "Rol bulunamadi" }, { status: 404 })
        }

        // Sistem/Super Admin rolü silinemez
        if (existing.name === "Super Admin" || existing.name === "Branch Admin") {
            return NextResponse.json({ error: "Sistem rolleri silinemez" }, { status: 400 })
        }

        const assignedCount = await prisma.userBranchRole.count({
            where: { roleId: id }
        })

        if (assignedCount > 0) {
            // Kullanımda olan rol silinmeye çalışılırsa 409 + kullanıcı sayısını dön
            return NextResponse.json({
                error: `Bu rol ${assignedCount} kullaniciya atanmis. Once rol atamalarini kaldirin.`,
                assignedCount
            }, { status: 409 })
        }

        await prisma.role.delete({ where: { id } })
        return NextResponse.json({ success: true, message: "Rol başarıyla silindi" })
    } catch (error) {
        console.error("Error deleting role:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
