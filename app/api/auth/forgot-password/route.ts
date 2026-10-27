import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"

export async function POST(req: Request) {
    try {
        const { username } = await req.json()

        if (!username) {
            return NextResponse.json(
                { error: "Kullanıcı adı zorunludur" },
                { status: 400 }
            )
        }

        // Verify caller is Super Admin
        const cookieStore = await cookies()
        const token = cookieStore.get("auth-token")?.value

        if (!token) {
            return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
        }

        const secret = new TextEncoder().encode(JWT_SECRET)
        const { payload } = await jwtVerify(token, secret)

        // Check if caller is Super Admin
        const callerRoles = await prisma.userBranchRole.findMany({
            where: { userId: payload.userId as string },
            include: { role: true },
        })
        const isSuperAdmin = callerRoles.some(r => r.role.name === "Super Admin")

        // Allow self-service for any user
        const targetUser = await prisma.user.findUnique({ where: { username } })
        if (!targetUser) {
            return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 })
        }

        const isSelf = payload.userId === targetUser.id

        if (!isSuperAdmin && !isSelf) {
            return NextResponse.json({ error: "Bu işlem için yetkiniz yok" }, { status: 403 })
        }

        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-8) + "A1!"
        const hashedPassword = await bcrypt.hash(tempPassword, 10)

        await prisma.user.update({
            where: { username },
            data: { password: hashedPassword },
        })

        return NextResponse.json({
            message: "Geçici şifre oluşturuldu",
            tempPassword: isSuperAdmin ? tempPassword : undefined,
            note: isSuperAdmin
                ? "Bu geçici şifreyi kullanıcıya iletin. Giriş sonrası değiştirmesini önerin."
                : "E-posta adresinize gönderildi (simüle edildi). Yöneticinizle iletişime geçin.",
        })
    } catch (error) {
        console.error("Forgot password error:", error)
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
    }
}
