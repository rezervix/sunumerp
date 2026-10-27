import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"
import { isDemoModeActive, getMockData } from "@/lib/data-controller"

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get("branchId")

    if (!branchId) {
        return NextResponse.json({ error: "Branch ID required" }, { status: 400 })
    }

    const auth = await requirePermission("orders", "view", branchId)
    if (auth instanceof NextResponse) return auth

    if (isDemoModeActive()) {
        const rawMockOrders = getMockData("orders", branchId) as any[]
        const orders = rawMockOrders.map(o => ({
            ...o,
            customer: o.customerId ? {
                id: o.customerId,
                name: o.customerName || "",
                company: o.companyName || ""
            } : null
        }))
        return NextResponse.json({
            data: orders,
            total: orders.length,
            page: 1,
            pageSize: 100
        })
    }

    const take = parseInt(searchParams.get("take") || "20")
    const skip = parseInt(searchParams.get("skip") || "0")

    try {
        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where: { branchId },
                orderBy: { createdAt: "desc" },
                include: { customer: { select: { id: true, name: true, company: true } } },
                take,
                skip,
            }),
            prisma.order.count({ where: { branchId } }),
        ])
        return NextResponse.json({ data: orders, total, page: Math.floor(skip / take) + 1, pageSize: take })
    } catch (error) {
        console.error("Error fetching orders:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { branchId, title, orderType, description, quantity, priority, customerId, orderNumber: reqOrderNumber, paymentStatus, totalAmount, customerName, companyName, customerPhone, files, orderDate } = body

        if (!branchId || !title || !orderType) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const auth = await requirePermission("orders", "create", branchId)
        if (auth instanceof NextResponse) return auth

        // Generate a simple order number if not provided
        let orderNumber = reqOrderNumber;
        if (!orderNumber) {
            const count = await prisma.order.count({ where: { branchId } })
            orderNumber = `ORD-${(count + 1).toString().padStart(4, "0")}`
        }

        const order = await prisma.order.create({
            data: {
                branchId,
                title,
                orderType,
                description,
                quantity: quantity ? Number(quantity) : undefined,
                priority: priority || "normal",
                orderNumber,
                status: "pending",
                customerId: customerId || null,
                paymentStatus: paymentStatus || "unpaid",
                totalAmount: totalAmount ? Number(totalAmount) : undefined,
                customerName: customerName || null,
                companyName: companyName || null,
                customerPhone: customerPhone || null,
                files: files ? JSON.stringify(files) : null,
                orderDate: orderDate ? new Date(orderDate) : new Date(),
            },
        })

        return NextResponse.json(order)
    } catch (error) {
        console.error("Error creating order:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")

        if (!id) {
            return NextResponse.json({ error: "Order ID required" }, { status: 400 })
        }

        const record = await prisma.order.findUnique({ where: { id }, select: { branchId: true } })
        if (!record) return NextResponse.json({ error: "Siparis bulunamadi" }, { status: 404 })

        const auth = await requirePermission("orders", "delete", record.branchId)
        if (auth instanceof NextResponse) return auth

        await prisma.order.delete({
            where: { id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting order:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json()
        const { id, status, title, orderType, description, quantity, priority, customerId, orderNumber, paymentStatus, totalAmount, customerName, companyName, customerPhone, files, orderDate, notes } = body

        if (!id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 })
        }

        const record = await prisma.order.findUnique({ where: { id }, select: { branchId: true } })
        if (!record) return NextResponse.json({ error: "Siparis bulunamadi" }, { status: 404 })

        const auth = await requirePermission("orders", "update", record.branchId)
        if (auth instanceof NextResponse) return auth

        // If only status is provided (for status update dialog), just update status
        const isStatusOnlyUpdate = Object.keys(body).length <= 3 && status; // id, status, notes

        let updateData: any = {}

        if (isStatusOnlyUpdate) {
            updateData = { status }
        } else {
            updateData = {
                title,
                orderType,
                description,
                quantity: quantity ? Number(quantity) : null,
                priority,
                orderNumber,
                status,
                customerId: customerId || null,
                paymentStatus,
                totalAmount: totalAmount ? Number(totalAmount) : null,
                customerName: customerName || null,
                companyName: companyName || null,
                customerPhone: customerPhone || null,
                files: files ? JSON.stringify(files) : null,
                orderDate: orderDate ? new Date(orderDate) : undefined,
            }
        }

        const order = await prisma.order.update({
            where: { id },
            data: updateData,
        })

        return NextResponse.json(order)
    } catch (error) {
        console.error("Error updating order:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
