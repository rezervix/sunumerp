import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { prisma } from "@/lib/db"
import { createLocalDebugSession, DEBUG_USER_ID } from "@/lib/auth/local-debug"
import { isPlatformDeveloperUser } from "@/lib/auth/server-permission"

if (!process.env.JWT_SECRET) {
    console.warn(
        "[auth/me] WARNING: JWT_SECRET is not set in environment variables. " +
        "Using fallback secret -- this is insecure in production!"
    )
}

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"

export async function GET() {
    try {
        // 1. Cookie oku
        const cookieStore = await cookies()
        const token = cookieStore.get("auth-token")?.value
        console.log(
            "[auth/me] auth-token cookie:",
            token ? token.substring(0, 20) + "..." : "NOT FOUND"
        )

        if (!token) {
            console.log("[auth/me] No token found -> returning 401 Not authenticated")
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        // 2. JWT dogrulama
        let payload: { userId?: unknown; username?: unknown; [key: string]: unknown }
        try {
            const secret = new TextEncoder().encode(JWT_SECRET)
            const result = await jwtVerify(token, secret)
            payload = result.payload as typeof payload
            console.log("[auth/me] JWT verified. Payload userId:", payload.userId)
        } catch (jwtError) {
            console.error("[auth/me] Token verification failed:", jwtError)
            return NextResponse.json({ error: "Token verification failed" }, { status: 401 })
        }

        // 3. Local debug kullanicisi ise sahte oturum don — YALNIZCA development
        const userId = payload.userId as string
        const username = typeof payload.username === "string" ? payload.username : ""
        const isPlatformDev = await isPlatformDeveloperUser(userId, username)

        if (userId === DEBUG_USER_ID && process.env.NODE_ENV !== "production") {
            const debugUsername = username || "local-debug"
            const sessionData = createLocalDebugSession(debugUsername)
            console.log("[auth/me] Returning local debug session for:", debugUsername)
            return NextResponse.json({ ...sessionData, isPlatformDeveloper: true, token })
        }

        console.log("[auth/me] Looking up user in DB with id:", userId)

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                branches: {
                    include: {
                        role: true,
                        branch: true,
                    },
                },
            },
        })

        console.log(
            "[auth/me] DB result -- user found:",
            !!user,
            "| isActive:",
            user?.isActive
        )

        if (!user || !user.isActive) {
            console.log("[auth/me] User not found or inactive -> returning 404")
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const branches = user.branches.map((ubr) => ({
            ...ubr,
            role: ubr.role
                ? {
                      ...ubr.role,
                      permissions: ubr.role.permissions
                          ? JSON.parse(ubr.role.permissions as string)
                          : [],
                  }
                : null,
            branch: ubr.branch
                ? {
                      ...ubr.branch,
                      operationalHours: ubr.branch.operationalHours
                          ? JSON.parse(ubr.branch.operationalHours as string)
                          : undefined,
                  }
                : null,
        }))

        console.log("[auth/me] Returning user data for:", user.username)

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
            isPlatformDeveloper: isPlatformDev,
            token,
        })
    } catch (error) {
        console.error("[auth/me] Unexpected error in GET handler:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
