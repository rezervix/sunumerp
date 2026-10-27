import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get("branchId")

    const auth = await requirePermission("reminders", "view", branchId || undefined)
    if (auth instanceof NextResponse) return auth

    try {
        const reminders = await prisma.reminder.findMany({
            where: { branchId: branchId || undefined },
            orderBy: { dueDate: "asc" },
        })
        return NextResponse.json(reminders)
    } catch (error) {
        console.error("Error fetching reminders:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { branchId, title, description, dueDate, time, priority } = body

        if (!branchId || !title || !dueDate) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const auth = await requirePermission("reminders", "create", branchId)
        if (auth instanceof NextResponse) return auth

        // Combine date and time if time is provided
        let dueDateTime = new Date(dueDate)
        if (time) {
            const [hours, minutes] = time.split(':')
            dueDateTime.setHours(parseInt(hours), parseInt(minutes))
        }

        const reminder = await prisma.reminder.create({
            data: {
                branchId,
                title,
                description,
                startDate: body.startDate ? new Date(body.startDate) : undefined,
                dueDate: dueDateTime,
                priority: priority || "normal",
                status: "pending",
            },
        })

        return NextResponse.json(reminder)
    } catch (error) {
        console.error("Error creating reminder:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")

        if (!id) {
            return NextResponse.json({ error: "Reminder ID required" }, { status: 400 })
        }

        const record = await prisma.reminder.findUnique({ where: { id }, select: { branchId: true } })
        if (!record) return NextResponse.json({ error: "Hatirlatici bulunamadi" }, { status: 404 })

        const auth = await requirePermission("reminders", "delete", record.branchId)
        if (auth instanceof NextResponse) return auth

        await prisma.reminder.delete({
            where: { id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting reminder:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json()
        const { id, status, category, title, description, dueDate, priority } = body

        if (!id) {
            return NextResponse.json({ error: "Reminder ID required" }, { status: 400 })
        }

        const record = await prisma.reminder.findUnique({ where: { id }, select: { branchId: true } })
        if (!record) return NextResponse.json({ error: "Hatirlatici bulunamadi" }, { status: 404 })

        const auth = await requirePermission("reminders", "update", record.branchId)
        if (auth instanceof NextResponse) return auth

        const reminder = await prisma.reminder.update({
            where: { id },
            data: {
                status,
                category,
                title,
                description,
                startDate: body.startDate ? new Date(body.startDate) : undefined,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                priority
            },
        })

        return NextResponse.json(reminder)
    } catch (error) {
        console.error("Error updating reminder:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

