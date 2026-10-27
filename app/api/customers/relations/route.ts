import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"

async function logTaskStatusChange(taskId: string, oldStatus: string | null | undefined, newStatus: string | null | undefined, userId: string) {
    if (!taskId || !userId || !oldStatus || !newStatus || oldStatus === newStatus) return

    await prisma.taskStatusHistory.create({
        data: {
            taskId,
            userId,
            oldStatus,
            newStatus,
        },
    })
}

async function getUser(req: Request) {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) return null

    try {
        const secret = new TextEncoder().encode(JWT_SECRET)
        const { payload } = await jwtVerify(token, secret)
        return payload
    } catch {
        return null
    }
}

/**
 * GET /api/customers/relations
 * Query params: ?customerId=...&type=note|task|document|chat|contact&page=1&pageSize=10
 * Sadece ilgili iliski turunu dondurur (tum musteri objesi degil).
 */
export async function GET(req: Request) {
    const user = await getUser(req)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get("customerId")
    const id = searchParams.get("id")
    const type = searchParams.get("type")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "10")))
    const skip = (page - 1) * pageSize

    if (!customerId && !id) {
        return NextResponse.json({ error: "customerId veya id zorunludur" }, { status: 400 })
    }

    try {
        if (id) {
            let record: unknown = null
            if (type === "note") {
                record = await prisma.customerNote.findUnique({ where: { id } })
            } else if (type === "chat") {
                record = await prisma.customerChat.findUnique({ where: { id } })
            } else if (type === "document") {
                record = await prisma.customerDocument.findUnique({ where: { id } })
            } else if (type === "task") {
                record = await prisma.customerTask.findUnique({ where: { id } })
            } else if (type === "contact") {
                record = await prisma.customerContact.findUnique({ where: { id } })
            } else {
                return NextResponse.json({ error: "Gecersiz tip. note|chat|document|task|contact kullanin" }, { status: 400 })
            }

            if (!record) {
                return NextResponse.json({ error: "Not found" }, { status: 404 })
            }

            return NextResponse.json(record)
        }

        let data: unknown[]
        let total: number
        const where = customerId ? { customerId } : {}

        if (type === "note") {
            ;[data, total] = await Promise.all([
                prisma.customerNote.findMany({ where, orderBy: { createdAt: "desc" }, take: pageSize, skip }),
                prisma.customerNote.count({ where }),
            ])
        } else if (type === "chat") {
            ;[data, total] = await Promise.all([
                prisma.customerChat.findMany({ where, orderBy: { timestamp: "desc" }, take: pageSize, skip }),
                prisma.customerChat.count({ where }),
            ])
        } else if (type === "document") {
            ;[data, total] = await Promise.all([
                prisma.customerDocument.findMany({ where, orderBy: { createdAt: "desc" }, take: pageSize, skip }),
                prisma.customerDocument.count({ where }),
            ])
        } else if (type === "task") {
            ;[data, total] = await Promise.all([
                prisma.customerTask.findMany({ where, orderBy: { dueDate: "asc" }, take: pageSize, skip }),
                prisma.customerTask.count({ where }),
            ])
        } else if (type === "contact") {
            ;[data, total] = await Promise.all([
                prisma.customerContact.findMany({ where, orderBy: { createdAt: "desc" }, take: pageSize, skip }),
                prisma.customerContact.count({ where }),
            ])
        } else {
            return NextResponse.json({ error: "Gecersiz tip. note|chat|document|task|contact kullanin" }, { status: 400 })
        }

        return NextResponse.json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
    } catch (error: any) {
        console.error("Error fetching customer relations:", error)
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const user = await getUser(req)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const body = await req.json()
        const { type, customerId, ...data } = body

        if (!type || !customerId) {
            return NextResponse.json({ error: "Missing type or customerId" }, { status: 400 })
        }

        let record
        if (type === "note") {
            record = await prisma.customerNote.create({ data: { customerId, ...data } })
        } else if (type === "chat") {
            record = await prisma.customerChat.create({ data: { customerId, ...data } })
        } else if (type === "document") {
            record = await prisma.customerDocument.create({ data: { customerId, ...data } })
        } else if (type === "task") {
            if (data.dueDate) data.dueDate = new Date(data.dueDate)
            record = await prisma.customerTask.create({ data: { customerId, ...data } })
            if (record.status) {
                await logTaskStatusChange(record.id, "created", record.status, user.userId as string)
            }
        } else if (type === "contact") {
            record = await prisma.customerContact.create({ data: { customerId, ...data } })
        } else {
            return NextResponse.json({ error: "Invalid type" }, { status: 400 })
        }

        return NextResponse.json(record)
    } catch (error: any) {
        console.error("Error creating relation:", error)
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    const user = await getUser(req)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const body = await req.json()
        const { type, id, ...data } = body

        if (!type || !id) {
            return NextResponse.json({ error: "Missing type or id" }, { status: 400 })
        }

        let record
        if (type === "note") {
            record = await prisma.customerNote.update({ where: { id }, data })
        } else if (type === "chat") {
            record = await prisma.customerChat.update({ where: { id }, data })
        } else if (type === "document") {
            record = await prisma.customerDocument.update({ where: { id }, data })
        } else if (type === "task") {
            const existing = await prisma.customerTask.findUnique({ where: { id } })
            if (data.dueDate) data.dueDate = new Date(data.dueDate)
            record = await prisma.customerTask.update({ where: { id }, data })
            if (existing && data.status && existing.status !== data.status) {
                await logTaskStatusChange(id, existing.status, data.status, user.userId as string)
            }
        } else if (type === "contact") {
            record = await prisma.customerContact.update({ where: { id }, data })
        } else {
            return NextResponse.json({ error: "Invalid type" }, { status: 400 })
        }

        return NextResponse.json(record)
    } catch (error: any) {
        console.error("Error updating relation:", error)
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    const user = await getUser(req)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const { searchParams } = new URL(req.url)
        const type = searchParams.get("type")
        const id = searchParams.get("id")

        if (!type || !id) {
            return NextResponse.json({ error: "Missing type or id" }, { status: 400 })
        }

        if (type === "note") {
            await prisma.customerNote.delete({ where: { id } })
        } else if (type === "chat") {
            await prisma.customerChat.delete({ where: { id } })
        } else if (type === "document") {
            await prisma.customerDocument.delete({ where: { id } })
        } else if (type === "task") {
            await prisma.customerTask.delete({ where: { id } })
        } else if (type === "contact") {
            await prisma.customerContact.delete({ where: { id } })
        } else {
            return NextResponse.json({ error: "Invalid type" }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Error deleting relation:", error)
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
    }
}
