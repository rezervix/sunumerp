import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

export async function GET(req: Request) {
    const auth = await requirePermission("notes", "read")
    if (auth instanceof NextResponse) {
        return auth
    }
    const userId = auth.payload.userId

    try {
        const notes = await prisma.note.findMany({
            where: { userId, isDeleted: false },
            orderBy: { updatedAt: "desc" },
        })

        return NextResponse.json(notes)
    } catch (error) {
        console.error("Error fetching notes:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const auth = await requirePermission("notes", "create")
    if (auth instanceof NextResponse) {
        return auth
    }
    const userId = auth.payload.userId

    try {
        const body = await req.json()
        const { title, content } = body

        if (!title || !content) {
            return NextResponse.json({ error: "Title and content are required" }, { status: 400 })
        }

        const note = await prisma.note.create({
            data: {
                userId,
                title,
                content,
            },
        })

        return NextResponse.json(note, { status: 201 })
    } catch (error) {
        console.error("Error creating note:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

