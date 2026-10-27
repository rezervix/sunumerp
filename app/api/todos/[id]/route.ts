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
        const existing = await prisma.todo.findUnique({ where: { id } })
        if (!existing || existing.userId !== userId) {
            return NextResponse.json({ error: "Todo not found or unauthorized" }, { status: 404 })
        }

        const body = await req.json()
        const { title, description, priority, status, dueDate } = body

        const updated = await prisma.todo.update({
            where: { id },
            data: {
                title,
                description,
                priority,
                status,
                startDate: body.startDate ? new Date(body.startDate) : null,
                dueDate: dueDate ? new Date(dueDate) : null,
            },
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error("Error updating todo:", error)
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
        const existing = await prisma.todo.findUnique({ where: { id } })
        if (!existing || existing.userId !== userId) {
            return NextResponse.json({ error: "Todo not found or unauthorized" }, { status: 404 })
        }

        await prisma.todo.delete({ where: { id } })

        return new NextResponse(null, { status: 204 })
    } catch (error) {
        console.error("Error deleting todo:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
