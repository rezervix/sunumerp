import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

export async function GET(req: Request) {
    const auth = await requirePermission("todos", "read")
    if (auth instanceof NextResponse) {
        return auth
    }
    const userId = auth.payload.userId

    const { searchParams } = new URL(req.url)
    const take = parseInt(searchParams.get("take") || "20")
    const skip = parseInt(searchParams.get("skip") || "0")

    try {
        const [todos, total] = await Promise.all([
            prisma.todo.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                take,
                skip,
            }),
            prisma.todo.count({ where: { userId } }),
        ])

        return NextResponse.json({ data: todos, total, page: Math.floor(skip / take) + 1, pageSize: take })
    } catch (error) {
        console.error("Error fetching todos:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const auth = await requirePermission("todos", "create")
    if (auth instanceof NextResponse) {
        return auth
    }
    const userId = auth.payload.userId

    try {
        const body = await req.json()
        const { title, description, priority, dueDate } = body

        if (!title) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 })
        }

        const todo = await prisma.todo.create({
            data: {
                userId,
                title,
                description,
                priority: priority || "medium",
                status: "pending",
                startDate: body.startDate ? new Date(body.startDate) : null,
                dueDate: dueDate ? new Date(dueDate) : null,
            },
        })

        return NextResponse.json(todo, { status: 201 })
    } catch (error) {
        console.error("Error creating todo:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

