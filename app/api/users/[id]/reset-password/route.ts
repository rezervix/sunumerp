import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"
import bcrypt from "bcryptjs"
import { createAuditLog } from "@/lib/audit"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requirePermission("users", "update")
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await req.json()
    const { password } = body

    if (!password || password.length < 6) {
        return NextResponse.json({ error: "Sifre en az 6 karakter olmalidir" }, { status: 400 })
    }

    try {
        const user = await prisma.user.findUnique({ where: { id } })
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        // Transaction ile şifre güncelleme, log yazma ve session invalidation işlemlerini yap
        await prisma.$transaction([
            prisma.user.update({
                where: { id },
                data: { password: hashedPassword, mustChangePassword: true }
            }),
            prisma.userSession.updateMany({
                where: { userId: id, isActive: true },
                data: { isActive: false, revokedAt: new Date() }
            }),
            prisma.passwordResetLog.create({
                data: {
                    userId: id,
                    resetBy: auth.payload.userId
                }
            })
        ])

        await createAuditLog({
            userId: auth.payload.userId,
            action: 'RESET_PASSWORD',
            resource: 'USER',
            resourceId: id,
            details: { username: user.username }
        })

        return NextResponse.json({ success: true, message: "Sifre basariyla sifirlandi ve tüm oturumlar sonlandirildi" })
    } catch (error) {
        console.error("Error resetting password:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
