import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"
import { createAuditLog } from "@/lib/audit"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requirePermission("users", "update")
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await req.json()
    const { isActive } = body

    if (isActive === undefined) {
        return NextResponse.json({ error: "isActive field is required" }, { status: 400 })
    }

    // Bir kullanıcı kendi hesabını pasifleştiremesin
    if (id === auth.payload.userId && !isActive) {
        return NextResponse.json({ error: "Kendi hesabinizi pasif yapamazsiniz" }, { status: 400 })
    }

    try {
        const user = await prisma.user.findUnique({ where: { id } })
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // Transaction içinde güncelle ve pasif yapıldıysa session'ları sonlandır
        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id },
                data: { isActive }
            })

            if (!isActive) {
                await tx.userSession.updateMany({
                    where: { userId: id, isActive: true },
                    data: { isActive: false, revokedAt: new Date() }
                })
            }
        })

        await createAuditLog({
            userId: auth.payload.userId,
            action: isActive ? 'ACTIVATE' : 'DEACTIVATE',
            resource: 'USER',
            resourceId: id,
            details: { username: user.username }
        })

        return NextResponse.json({ success: true, isActive })
    } catch (error) {
        console.error("Error updating user status:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
