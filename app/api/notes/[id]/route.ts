import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { prisma } from "@/lib/db"

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"

async function getUserId() {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value
    if (!token) return null

    try {
        const secret = new TextEncoder().encode(JWT_SECRET)
        const { payload } = await jwtVerify(token, secret)
        return payload.userId as string
    } catch {
        return null
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const userId = await getUserId()
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 })

    try {
        const existing = await prisma.note.findUnique({ where: { id } })
        if (!existing || existing.userId !== userId) {
            return NextResponse.json({ error: "Note not found or unauthorized" }, { status: 404 })
        }

        const body = await req.json()
        const { title, content, isDeleted } = body

        const updated = await prisma.note.update({
            where: { id },
            data: {
                title: title !== undefined ? title : existing.title,
                content: content !== undefined ? content : existing.content,
                isDeleted: isDeleted !== undefined ? isDeleted : existing.isDeleted,
            },
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error("Error updating note:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const userId = await getUserId()
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 })

    try {
        const existing = await prisma.note.findUnique({ where: { id } })
        if (!existing || existing.userId !== userId) {
            return NextResponse.json({ error: "Note not found or unauthorized" }, { status: 404 })
        }

        // Implementing Hard Delete for safety if needed, 
        // but the plan says "soft delete". 
        // Soft delete is actually just PUT isDeleted = true, but we can do hard delete here 
        // for true removal if they are already soft deleted. 
        await prisma.note.delete({ where: { id } })

        return new NextResponse(null, { status: 204 })
    } catch (error) {
        console.error("Error deleting note:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
