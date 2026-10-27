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
 * DELETE /api/hr/[id]/documents/[docId] — Belge sil
 */
export async function DELETE(
    req: Request,
    context: { params: Promise<{ id: string; docId: string }> }
) {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const { id: candidateId, docId } = await context.params

        // Belge bu adaya ait mi kontrol et
        const doc = await prisma.candidateDocument.findUnique({
            where: { id: docId },
            select: { candidateId: true },
        })

        if (!doc) return NextResponse.json({ error: "Belge bulunamadi" }, { status: 404 })
        if (doc.candidateId !== candidateId) {
            return NextResponse.json({ error: "Bu belge bu adaya ait degil" }, { status: 403 })
        }

        await prisma.candidateDocument.delete({ where: { id: docId } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting candidate document:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
