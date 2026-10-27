import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import bcrypt from "bcryptjs"
import { createAuditLog } from "@/lib/audit"

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

export async function GET() {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const userData = await prisma.user.findUnique({
            where: { id: user.userId as string },
            select: { id: true, username: true, fullName: true, email: true, phone: true, avatarUrl: true },
        })
        return NextResponse.json(userData)
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const body = await req.json()
        const { fullName, email, phone, avatarUrl, currentPassword, newPassword } = body

        const updateData: any = {}
        if (fullName) updateData.fullName = fullName
        if (email !== undefined) updateData.email = email
        if (phone !== undefined) updateData.phone = phone
        if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl

        if (newPassword) {
            if (!currentPassword) {
                return NextResponse.json({ error: "Mevcut şifre zorunludur" }, { status: 400 })
            }

            const userData = await prisma.user.findUnique({ where: { id: user.userId as string } })
            if (!userData) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 })

            const isValid = await bcrypt.compare(currentPassword, userData.password)
            if (!isValid) {
                return NextResponse.json({ error: "Mevcut şifre hatalı" }, { status: 400 })
            }

            updateData.password = await bcrypt.hash(newPassword, 10)
        }

        const updated = await prisma.user.update({
            where: { id: user.userId as string },
            data: updateData,
            select: { id: true, username: true, fullName: true, email: true, phone: true },
        })

        await createAuditLog({
            userId: user.userId as string,
            action: 'UPDATE_PROFILE',
            resource: 'SETTINGS',
            details: { updatedFields: Object.keys(updateData).filter(k => k !== 'password') }
        });

        return NextResponse.json({ success: true, user: updated })
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
