import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"

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

/**
 * GET /api/hr/[id]/chats — Gorusme gecmisini getir
 */
export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const { id: candidateId } = await context.params

        const chats = await prisma.candidateChat.findMany({
            where: { candidateId },
            orderBy: { timestamp: "desc" },
        })

        return NextResponse.json(chats)
    } catch (error) {
        console.error("Error fetching candidate chats:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

/**
 * POST /api/hr/[id]/chats — Gorusme kaydi ekle
 */
export async function POST(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const { id: candidateId } = await context.params
        const body = await req.json()
        const { type, content, fileUrl, nextContactDate } = body

        // Aday var mi kontrol et
        const candidate = await prisma.candidate.findUnique({ where: { id: candidateId }, select: { id: true } })
        if (!candidate) return NextResponse.json({ error: "Aday bulunamadi" }, { status: 404 })

        const chat = await prisma.candidateChat.create({
            data: {
                candidateId,
                type: type || "Telefon",
                content: content || null,
                fileUrl: fileUrl || null,
                nextContactDate: nextContactDate ? new Date(nextContactDate) : null,
                timestamp: new Date(),
            },
        })

        return NextResponse.json(chat, { status: 201 })
    } catch (error) {
        console.error("Error creating candidate chat:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
