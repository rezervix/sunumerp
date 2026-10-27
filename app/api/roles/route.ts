import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

/**
 * Sadece Super Admin erisebilir. 
 * Biz burada dummy bir resource "roles" ve "manage" action kullanalim.
 * requirePermission super admin ise her seye izin verir zaten.
 */
async function checkAdmin() {
    const auth = await requirePermission("roles", "manage")
    return auth
}

export async function GET() {
    const auth = await checkAdmin()
    if (auth instanceof NextResponse) return auth

    try {
        const roles = await prisma.role.findMany({
            select: { id: true, name: true, description: true, permissions: true },
            orderBy: { name: "asc" },
        })

        const parsed = roles.map(r => ({
            ...r,
            permissions: (() => {
                try { return JSON.parse(r.permissions) } catch { return {} }
            })()
        }))

        return NextResponse.json(parsed)
    } catch (error) {
        console.error("Error fetching roles:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const auth = await checkAdmin()
    if (auth instanceof NextResponse) return auth

    try {
        const body = await req.json()
        const { name, description, permissions } = body

        if (!name || !permissions) {
            return NextResponse.json({ error: "Rol adi ve izinler zorunludur" }, { status: 400 })
        }

        const existing = await prisma.role.findUnique({ where: { name } })
        if (existing) {
            return NextResponse.json({ error: "Bu isimde bir rol zaten mevcut" }, { status: 400 })
        }

        const role = await prisma.role.create({
            data: {
                name,
                description: description || null,
                permissions: typeof permissions === "string" ? permissions : JSON.stringify(permissions),
            },
        })

        return NextResponse.json({
            ...role,
            permissions: (() => { try { return JSON.parse(role.permissions) } catch { return {} } })()
        }, { status: 201 })
    } catch (error) {
        console.error("Error creating role:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    const auth = await checkAdmin()
    if (auth instanceof NextResponse) return auth

    try {
        const body = await req.json()
        const { id, name, description, permissions } = body

        if (!id) {
            return NextResponse.json({ error: "Rol ID zorunludur" }, { status: 400 })
        }

        const existing = await prisma.role.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: "Rol bulunamadi" }, { status: 404 })
        }

        const updateData: { name?: string; description?: string; permissions?: string } = {}
        if (name !== undefined) updateData.name = name
        if (description !== undefined) updateData.description = description
        if (permissions !== undefined) {
            updateData.permissions = typeof permissions === "string" ? permissions : JSON.stringify(permissions)
        }

        const role = await prisma.role.update({
            where: { id },
            data: updateData,
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

export async function DELETE(req: Request) {
    const auth = await checkAdmin()
    if (auth instanceof NextResponse) return auth

    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")

        if (!id) {
            return NextResponse.json({ error: "Rol ID zorunludur" }, { status: 400 })
        }

        const assignedCount = await prisma.userBranchRole.count({ where: { roleId: id } })
        if (assignedCount > 0) {
            return NextResponse.json({
                error: `Bu rol ${assignedCount} kullaniciya atanmis. Once rol atamalarini kaldirin.`
            }, { status: 400 })
        }

        await prisma.role.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting role:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

