import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { prisma } from "@/lib/db"

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"

export async function POST() {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get("auth-token")?.value

        if (token) {
            try {
                const secret = new TextEncoder().encode(JWT_SECRET)
                const { payload } = await jwtVerify(token, secret)
                const sessionId = payload.sessionId as string

                if (sessionId) {
                    await prisma.userSession.update({
                        where: { id: sessionId },
                        data: { isActive: false, revokedAt: new Date() }
                    })
                }
            } catch (jwtError) {
                console.error("Logout: Failed to verify/revoke token session:", jwtError)
            }
            cookieStore.delete("auth-token")
        }
    } catch (error) {
        console.error("Logout: Unexpected error:", error)
    }

    return NextResponse.json({ success: true })
}
