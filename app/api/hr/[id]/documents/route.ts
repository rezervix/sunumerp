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
 * POST /api/hr/[id]/documents — Adaya belge ekle
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
        const { name, url, type, notes } = body

        if (!name || !url) {
            return NextResponse.json({ error: "Belge adi ve URL zorunludur" }, { status: 400 })
        }

        // Aday var mi kontrol et
        const candidate = await prisma.candidate.findUnique({ where: { id: candidateId }, select: { id: true } })
        if (!candidate) return NextResponse.json({ error: "Aday bulunamadi" }, { status: 404 })

        const document = await prisma.candidateDocument.create({
            data: {
                candidateId,
                name,
                url,
                type: type || "CV",
                notes: notes || null,
            },
        })

        return NextResponse.json(document, { status: 201 })
    } catch (error) {
        console.error("Error adding candidate document:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

/**
 * GET /api/hr/[id]/documents — Adayin belgelerini listele
 */
export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const { id: candidateId } = await context.params

        const documents = await prisma.candidateDocument.findMany({
            where: { candidateId },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json(documents)
    } catch (error) {
        console.error("Error fetching candidate documents:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
