import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"
import { createAuditLog } from "@/lib/audit"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requirePermission("users", "view")
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    try {
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                branches: {
                    include: {
                        branch: true,
                        role: true
                    }
                }
            }
        })

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const formatted = {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            isActive: user.isActive,
            department: user.department,
            position: user.position,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
            branches: user.branches.map(b => ({
                branchId: b.branchId,
                branchName: b.branch?.name || "",
                roleName: b.role?.name || "",
                roleColor: b.branch?.themeColor || "#3B82F6"
            }))
        }

        return NextResponse.json(formatted)
    } catch (error) {
        console.error("Error fetching user detail:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requirePermission("users", "delete")
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    // Bir kullanıcı kendi hesabını silemesin
    if (id === auth.payload.userId) {
        return NextResponse.json({ error: "Kendi hesabinizi silemezsiniz" }, { status: 400 })
    }

    try {
        const user = await prisma.user.findUnique({ where: { id } })
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // Soft delete: isActive'i false yap ve tüm oturumlarını kapat
        await prisma.$transaction([
            prisma.user.update({
                where: { id },
                data: { isActive: false }
            }),
            prisma.userSession.updateMany({
                where: { userId: id, isActive: true },
                data: { isActive: false, revokedAt: new Date() }
            })
        ])

        await createAuditLog({
            userId: auth.payload.userId,
            action: 'SOFT_DELETE',
            resource: 'USER',
            resourceId: id,
            details: { username: user.username }
        })

        return NextResponse.json({ success: true, message: "Kullanıcı başarıyla silindi ve tüm aktif oturumları sonlandırıldı" })
    } catch (error) {
        console.error("Error deleting user:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
