import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { SignJWT } from "jose"
import { cookies } from "next/headers"
import { isLocalhostRequest, createLocalDebugSession } from "@/lib/auth/local-debug"

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"

export async function POST(req: Request) {
    try {
        const { username, password } = await req.json()

        if (!username || !password) {
            return NextResponse.json(
                { error: "Kullanıcı adı ve şifre zorunludur" },
                { status: 400 }
            )
        }

        const isDebug = isLocalhostRequest(req)

        if (isDebug) {
            const sessionData = createLocalDebugSession(username)
            const secret = new TextEncoder().encode(JWT_SECRET)
            const token = await new SignJWT({ userId: sessionData.user.id, username: sessionData.user.username })
                .setProtectedHeader({ alg: "HS256" })
                .setExpirationTime("24h")
                .sign(secret)

            const cookieStore = await cookies()
            cookieStore.set("auth-token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 60 * 60 * 24,
                path: "/",
            })

            return NextResponse.json({ ...sessionData, token })
        }

        const user = await prisma.user.findUnique({
            where: { username },
            include: {
                branches: {
                    include: {
                        role: true,
                        branch: true,
                    },
                },
            },
        })

        if (!user || !user.isActive) {
            return NextResponse.json(
                { error: "Kullanıcı adı veya şifre hatalı" },
                { status: 401 }
            )
        }

        const isValid = await bcrypt.compare(password, user.password)

        if (!isValid) {
            return NextResponse.json(
                { error: "Kullanıcı adı veya şifre hatalı" },
                { status: 401 }
            )
        }

        // 1. Veritabanında Oturum (UserSession) oluştur
        const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1"
        const userAgent = req.headers.get("user-agent") || "unknown"
        const tokenHash = `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
        
        const userSession = await prisma.userSession.create({
            data: {
                userId: user.id,
                tokenHash,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 saat
                ipAddress,
                userAgent,
                isActive: true
            }
        })

        // 2. Kullanıcının son giriş tarihini güncelle
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
        })

        // Generate JWT
        const secret = new TextEncoder().encode(JWT_SECRET)
        const token = await new SignJWT({ 
            userId: user.id, 
            username: user.username,
            sessionId: userSession.id 
        })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("24h")
            .sign(secret)

        // Set Cookie
        const isElectron = req.headers.get("user-agent")?.toLowerCase().includes("electron") || false;

        const cookieStore = await cookies()
        cookieStore.set("auth-token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production" && !isElectron,
            sameSite: "lax",
            maxAge: 60 * 60 * 24, // 24 hours
            path: "/",
        })

        const branches = user.branches.map((ubr) => ({
            ...ubr,
            role: ubr.role ? {
                ...ubr.role,
                permissions: ubr.role.permissions ? JSON.parse(ubr.role.permissions as string) : [],
            } : null,
            branch: ubr.branch ? {
                ...ubr.branch,
                operationalHours: ubr.branch.operationalHours ? JSON.parse(ubr.branch.operationalHours as string) : undefined,
            } : null,
        }))

        return NextResponse.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                isActive: user.isActive,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
            branches,
            token,
        })
    } catch (error) {
        console.error("Login error:", error)
        return NextResponse.json(
            { error: "Sunucu hatası" },
            { status: 500 }
        )
    }
}
