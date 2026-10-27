import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"
import { createAuditLog } from "@/lib/audit"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requirePermission("users", "view")
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    try {
        const userBranchRoles = await prisma.userBranchRole.findMany({
            where: { userId: id },
            include: {
                branch: true,
                role: true
            }
        })

        const formatted = userBranchRoles.map(ubr => ({
            id: ubr.id,
            branchId: ubr.branchId,
            branchName: ubr.branch?.name || "",
            roleId: ubr.roleId,
            roleName: ubr.role?.name || "",
            roleColor: ubr.branch?.themeColor || "#3B82F6",
            assignedAt: ubr.assignedAt,
            assignedBy: ubr.assignedBy
        }))

        return NextResponse.json(formatted)
    } catch (error) {
        console.error("Error fetching user branch roles:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requirePermission("users", "assign_roles")
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await req.json()
    const { branchId, roleName, roleId } = body

    if (!branchId || (!roleName && !roleId)) {
        return NextResponse.json({ error: "Sube ve rol alanlari zorunludur" }, { status: 400 })
    }

    try {
        // Rolü bul
        let role = null
        if (roleId) {
            role = await prisma.role.findUnique({ where: { id: roleId } })
        } else if (roleName) {
            role = await prisma.role.findUnique({ where: { name: roleName } })
        }

        if (!role) {
            return NextResponse.json({ error: "Belirtilen rol bulunamadi" }, { status: 400 })
        }

        // Şubenin varlığını sorgula
        const branch = await prisma.branch.findUnique({ where: { id: branchId } })
        if (!branch) {
            return NextResponse.json({ error: "Belirtilen sube bulunamadi" }, { status: 400 })
        }

        // Mevcut atamayı kontrol et
        const existing = await prisma.userBranchRole.findFirst({
            where: { userId: id, branchId }
        })

        let assignment
        if (existing) {
            assignment = await prisma.userBranchRole.update({
                where: { id: existing.id },
                data: {
                    roleId: role.id,
                    assignedBy: auth.payload.userId
                }
            })
        } else {
            assignment = await prisma.userBranchRole.create({
                data: {
                    userId: id,
                    branchId,
                    roleId: role.id,
                    assignedBy: auth.payload.userId
                }
            })
        }

        await createAuditLog({
            userId: auth.payload.userId,
            action: 'ASSIGN_ROLE',
            resource: 'USER',
            resourceId: id,
            details: { branchName: branch.name, roleName: role.name }
        })

        return NextResponse.json({ success: true, assignment })
    } catch (error) {
        console.error("Error assigning branch role:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requirePermission("users", "assign_roles")
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get("branchId")

    if (!branchId) {
        return NextResponse.json({ error: "Sube ID gereklidir" }, { status: 400 })
    }

    try {
        const existing = await prisma.userBranchRole.findFirst({
            where: { userId: id, branchId }
        })

        if (!existing) {
            return NextResponse.json({ error: "Sube atamasi bulunamadi" }, { status: 404 })
        }

        // Super Admin kendi Super Admin rolünü HQ şubesinden silemesin (sistem kilitlenmesini önleme)
        const role = await prisma.role.findUnique({ where: { id: existing.roleId } })
        if (role?.name === "Super Admin" && id === auth.payload.userId) {
            return NextResponse.json({ error: "Kendi Super Admin rolünüzü silemezsiniz" }, { status: 400 })
        }

        await prisma.userBranchRole.delete({
            where: { id: existing.id }
        })

        await createAuditLog({
            userId: auth.payload.userId,
            action: 'REMOVE_ROLE',
            resource: 'USER',
            resourceId: id,
            details: { branchId }
        })

        return NextResponse.json({ success: true, message: "Rol basariyla kaldirildi" })
    } catch (error) {
        console.error("Error removing branch role:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
